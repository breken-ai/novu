import type { TagsFilter } from '@novu/shared';
import { TagsFilterValidationError } from '@novu/shared';

/** A value as Express's extended (qs) query parser produces it. */
type QueryParamValue = string | number | boolean | null | undefined | QueryParamValue[] | QueryParamObject;
type QueryParamObject = { [key: string]: QueryParamValue };

/**
 * qs (Express's extended query parser) builds arrays of at most 20 entries (`arrayLimit`).
 * Past that it returns an object keyed by index, so `tags[]=a&tags[]=b&...` with 21+ tags
 * arrives as `{ 0: 'a', 1: 'b', ... }`. Turn such an object back into the array it was.
 */
function indexedObjectToArray(value: QueryParamValue): QueryParamValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value;
  }

  const keys = Object.keys(value);
  if (keys.length === 0 || !keys.every((key) => /^\d+$/.test(key))) {
    return value;
  }

  return keys.sort((a, b) => Number(a) - Number(b)).map((key) => value[key]);
}

/**
 * Coerce Express query / mixed shapes into `TagsFilter` for validation + normalization.
 */
export function parseTagsQueryValue(value: unknown): TagsFilter | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [];
    }

    const items = (value as QueryParamValue[]).map(indexedObjectToArray);
    const first = items[0];
    if (Array.isArray(first)) {
      const groups = items.map((group) => (Array.isArray(group) ? group.map((t) => String(t)) : [String(group)]));

      return {
        and: groups.map((g) => ({ or: g })),
      };
    }

    return items.map((t) => String(t));
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;

    const hasOr = Object.prototype.hasOwnProperty.call(record, 'or');
    const hasAnd = Object.prototype.hasOwnProperty.call(record, 'and');

    if (hasOr && hasAnd) {
      throw new TagsFilterValidationError('Tags filter cannot have both "or" and "and"');
    }

    if (hasOr) {
      const orVal = record['or'];
      if (!Array.isArray(orVal)) {
        return undefined;
      }

      return { or: orVal.map((t) => String(t)) };
    }

    if (hasAnd) {
      const andVal = record['and'];
      if (!Array.isArray(andVal)) {
        return undefined;
      }

      return {
        and: andVal.map((item) => {
          if (Array.isArray(item)) {
            return { or: item.map((t) => String(t)) };
          }

          if (typeof item === 'object' && item !== null && !Array.isArray(item) && 'or' in item) {
            const innerOr = (item as { or: unknown }).or;
            if (Array.isArray(innerOr)) {
              return { or: innerOr.map((t) => String(t)) };
            }
          }

          throw new TagsFilterValidationError('Each "and" entry must be { or: string[] } or a tag array');
        }),
      };
    }

    const keys = Object.keys(record).sort((a, b) => Number(a) - Number(b));

    // A flat tag list over the qs array limit: every entry is a single tag, so it is one OR-group.
    if (keys.length > 0 && keys.every((key) => /^\d+$/.test(key) && !isGroupValue(record[key] as QueryParamValue))) {
      return keys.map((key) => String(record[key]));
    }

    const groups: string[][] = [];

    for (const key of keys) {
      const group = indexedObjectToArray(record[key] as QueryParamValue);
      if (Array.isArray(group)) {
        groups.push(group.map((t) => String(t)));
      } else if (group !== undefined && group !== null) {
        groups.push([String(group)]);
      }
    }

    if (groups.length === 0) {
      return undefined;
    }

    if (groups.length === 1) {
      const [only] = groups;
      if (!only) {
        return undefined;
      }

      return only;
    }

    return {
      and: groups.map((g) => ({ or: g })),
    };
  }

  return undefined;
}

function isGroupValue(value: QueryParamValue): boolean {
  return Array.isArray(value) || (typeof value === 'object' && value !== null);
}

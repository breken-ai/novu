import { expect } from 'chai';

import { parseTagsQueryValue } from './parse-tags-query';

describe('parseTagsQueryValue', () => {
  it('coerces array elements to strings', () => {
    expect(parseTagsQueryValue([1, true, 'x'])).to.deep.equal(['1', 'true', 'x']);
  });

  it('coerces nested arrays to explicit { and: [{ or }] }', () => {
    expect(parseTagsQueryValue([[1, 'a'], [true]])).to.deep.equal({
      and: [{ or: ['1', 'a'] }, { or: ['true'] }],
    });
  });

  it('parses indexed object into { and } for multiple groups', () => {
    expect(
      parseTagsQueryValue({
        0: ['a', 'b'],
        1: ['c'],
      })
    ).to.deep.equal({
      and: [{ or: ['a', 'b'] }, { or: ['c'] }],
    });
  });

  it('parses indexed object with one group as flat string[]', () => {
    expect(parseTagsQueryValue({ 0: ['a', 'b'] })).to.deep.equal(['a', 'b']);
  });

  it('parses explicit { or }', () => {
    expect(parseTagsQueryValue({ or: [1, 'x'] })).to.deep.equal({ or: ['1', 'x'] });
  });

  /*
   * Express parses the query string with qs, which stops building arrays past 20 entries
   * (`arrayLimit`) and returns an object keyed by index instead. The inbox SDK sends a flat
   * tag list as repeated `tags[]=`, so 21+ tags reach this function as `{ 0: 'a', 1: 'b', ... }`.
   */
  it('parses an index-keyed object of single tags (a flat list over the qs array limit) as one OR-group', () => {
    const tags = Array.from({ length: 21 }, (_, index) => `tag-${index}`);
    const overflowed = Object.fromEntries(tags.map((tag, index) => [String(index), tag]));

    expect(parseTagsQueryValue(overflowed)).to.deep.equal(tags);
  });

  it('parses an OR-group over the qs array limit inside an AND filter', () => {
    const group = Array.from({ length: 21 }, (_, index) => `tag-${index}`);
    const overflowedGroup = Object.fromEntries(group.map((tag, index) => [String(index), tag]));

    expect(parseTagsQueryValue([overflowedGroup, ['other']])).to.deep.equal({
      and: [{ or: group }, { or: ['other'] }],
    });
  });
});

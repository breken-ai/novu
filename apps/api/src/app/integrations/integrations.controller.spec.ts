import { HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { expect } from 'chai';

import { IntegrationsController } from './integrations.controller';

/*
 * Nest answers a POST with 201 unless the handler sets @HttpCode. These actions document a 200
 * response, and SDKs generated from the spec accept only 200, so a 201 fails a successful call.
 */
describe('IntegrationsController response status codes', () => {
  it('returns 200 from POST /integrations/:integrationId/auto-configure', () => {
    const httpCode = Reflect.getMetadata(HTTP_CODE_METADATA, IntegrationsController.prototype.autoConfigureIntegration);

    expect(httpCode).to.equal(HttpStatus.OK);
  });

  it('returns 200 from POST /integrations/:integrationId/set-primary', () => {
    const httpCode = Reflect.getMetadata(HTTP_CODE_METADATA, IntegrationsController.prototype.setIntegrationAsPrimary);

    expect(httpCode).to.equal(HttpStatus.OK);
  });
});

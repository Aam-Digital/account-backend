[![Maintainability](https://api.codeclimate.com/v1/badges/6bf32c4f0345ea2bfb1b/maintainability)](https://codeclimate.com/github/Aam-Digital/account-backend/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/6bf32c4f0345ea2bfb1b/test_coverage)](https://codeclimate.com/github/Aam-Digital/account-backend/test_coverage)

# Account Backend

This backend service allows to perform user account related tasks on Keycloak.
It uses the Keycloak [Admin API](https://www.keycloak.org/docs-api/19.0.2/rest-api/index.html).
Some endpoints require a valid JWT as Bearer token to be sent with the request.

## Setup
For more Aam Digital setup related documentation have a look at the [ndb-setup](https://github.com/Aam-Digital/ndb-setup) repository.

A independent deployment can be done via docker

> `docker run aamdigital/account-ms:latest`

or directly through npm

> `npm install && npm start`

In both cases the following environment variables should be defined.
These can also be written to the `.env` file.

- `CORS` domain from which requests are accepted, e.g. `https://*.aam-digital.com`. Default `*` (all domains)
- `KEYCLOAK_URL` URL to the keycloak instance
- `KEYCLOAK_ADMIN` name of an admin account for the `master` realm. Default `admin`
- `KEYCLOAK_PASSWORD` password for the admin account
- `SENTRY_DSN` (optional) the [Sentry DSN](https://docs.sentry.io/product/sentry-basics/dsn-explainer/). If defined, error messages are sent to the sentry.io application monitoring & logging service.

## Usage

After starting the application the API documentation can be found under `/api`.
All available endpoints are described there.

## Development
This system is a Node.js application built with the [NestJS](https://nestjs.com/) framework.

To run and test this project locally:
1. `npm install` to download and set up all dependencies
2. `npm start` to run the application locally (see above for required environment variables)
3. `npm test` to execute unit tests

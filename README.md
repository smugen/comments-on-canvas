# Comments on Canvas

## Requirements Analysis

### Backend

- Data Models
  - User
    - email & password Authentication
    - email verification
    - password security
  - Image
  - Marker (Comment Thread)
  - Comment
- APIs
  - User
  - Me (current signed in user)
  - Image
  - Marker
  - Comment
- Dockerize

### Realtime

- API call triggers server broadcast events to all connected clients

### Frontend

## System Design

### Iteration 1

- Project Repo Scaffolding using some boilerplate I used before
  - [Node.js](package.json)
  - [TypeScript](./src/tsconfig.json)
- Development Environment
  - Docker Desktop WSL
  - [Docker Compose](docker-compose.yml) **with [Compose V2](https://docs.docker.com/compose/#compose-v2-and-the-new-docker-compose-command) enabled**
  - [MongoDB](https://hub.docker.com/_/mongo)
  - Set MongoDB credentials in [secret/.env](secret/.env), create this file if it doesn't exist
    - MONGO_INITDB_ROOT_USERNAME=
    - MONGO_INITDB_ROOT_PASSWORD=
  - `npm run docker-up` will spin up the MongoDB
- Data Models
  - [Mongoose ODM](https://mongoosejs.com/docs/guide.html)
  - [typegoose](https://typegoose.github.io/typegoose/), never used before, evaluate if the code could be cleaner
  - Unit tests using [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/)
  - User
    - Basic email address format validation
    - Store password using [scrypt](https://en.wikipedia.org/wiki/Scrypt)
- API
  - [Koa.js](https://koajs.com/)
  - Manual test using VSCode extension [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) with [test/api.http](test/api.http) (instead of Postman)
  - API Tests using [node-fetch](https://github.com/node-fetch/node-fetch/tree/2.x#readme)
  - User
    - `addUser` for Registration
  - Me
    - `getMe` for session validation
    - `putMe` for sign in
    - `delMe` for sign out
  - Image
    - `listImage` for listing all images
    - `addImage` for adding an image metadata
    - `getImage` for getting an image metadata
    - `updateImage` for updating an image metadata (move image position)
    - `putImage` for uploading an image than redirect to the image URL
  - Marker
    - `listMarker` for listing all markers
    - `addMarker` for adding a marker
    - `getMarker` for getting a marker
    - `updateMarker` for updating a marker (move marker position)
    - `delMarker` for deleting a marker (resolve thread)
    - Comment
      - `listComment` for listing comments of a marker (in a thread)
      - `addComment` for adding a comment to a marker (to a thread)
      - `delComment` for deleting a comment from a marker (from a thread)

### Iteration 2

- Dockerfile
- Realtime

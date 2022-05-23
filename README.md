# Comments on Canvas

## Requirements Analysis

### Backend

- Data Models
  - User
    - email & password Authentication
    - email verification
    - password security
  - Image
  - CommentMarker (Comment Thread)
  - CommentPost
- APIs
  - User
  - Me (current signed in user)
  - Image
  - CommentMarker
  - CommentPost

### Frontend

### Realtime

## System Design

### Iteration 1

- Project Repo Scaffolding using some boilerplate I used before
  - [Node.js](package.json)
  - [TypeScript](tsconfig.json)
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
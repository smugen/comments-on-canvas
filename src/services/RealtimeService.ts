import assert from 'assert';
import http from 'http';

import { Server } from 'socket.io';
import { Service } from 'typedi';

import { CommentDocument, ImageDocument, MarkerDocument } from '../models';

interface Saved {
  image?: ImageDocument;
  marker?: MarkerDocument;
  comment?: CommentDocument;
}

interface Removed {
  imageId?: string;
  markerId?: string;
  commentId?: string;
}

export interface ServerToClientEvents {
  saved: (saved: Saved) => void;
  removed: (removed: Removed) => void;
}

export interface ClientToServerEvents {
  subscribeMarker: (markerId: string, cb: (err?: Error) => void) => void;
  unsubscribeMarker: (markerId: string, cb: (err?: Error) => void) => void;
}

@Service()
export default class RealtimeService {
  private io?: Server<ClientToServerEvents, ServerToClientEvents>;

  private registerClientEvents(io: NonNullable<typeof this.io>) {
    io.on('connection', socket => {
      socket.on('subscribeMarker', async (markerId, cb) => {
        try {
          assert(typeof markerId === 'string');
          await socket.join(roomForMarker(markerId));
          cb();
        } catch (err) {
          if (!(err instanceof Error)) {
            throw err;
          }
          cb(err);
        }
      });

      socket.on('unsubscribeMarker', async (markerId, cb) => {
        try {
          assert(typeof markerId === 'string');
          await socket.leave(roomForMarker(markerId));
          cb();
        } catch (err) {
          if (!(err instanceof Error)) {
            throw err;
          }
          cb(err);
        }
      });
    });
  }

  attachServer(server: http.Server) {
    this.io ??= new Server();
    this.registerClientEvents(this.io);
    server.on('close', () => this.io?.close());
    this.io.attach(server);
  }

  close() {
    return this.io?.close();
  }

  emitSaved({ image, marker, comment }: Saved) {
    if (!this.io) {
      return;
    }

    (image || marker) && this.io.emit('saved', { image, marker });

    comment &&
      this.io
        .to(roomForMarker(comment.markerId.toString()))
        .emit('saved', { comment });
  }

  emitRemoved(
    { imageId, markerId, commentId }: Removed,
    comment?: CommentDocument,
  ) {
    if (!this.io) {
      return;
    }

    (imageId || markerId) && this.io.emit('removed', { imageId, markerId });

    comment &&
      commentId &&
      this.io
        .to(roomForMarker(comment.markerId.toString()))
        .emit('removed', { commentId });
  }
}

function roomForMarker(markerId: string) {
  return `Marker/${markerId}/Comment`;
}

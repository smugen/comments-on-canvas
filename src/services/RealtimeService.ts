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

interface ServerToClientEvents {
  saved: (saved: Saved) => void;
  removed: (removed: Removed) => void;
}

interface ClientToServerEvents {
  subscribeMarker: (markerId: string, cb: () => void) => void;
  unsubscribeMarker: (markerId: string, cb: () => void) => void;
}

@Service()
export default class RealtimeService {
  private readonly io = new Server<
    ClientToServerEvents,
    ServerToClientEvents
  >();

  constructor() {
    this.io.on('connection', socket => {
      socket.on('subscribeMarker', async (markerId, cb) => {
        await socket.join(roomForMarker(markerId));
        cb();
      });

      socket.on('unsubscribeMarker', async (markerId, cb) => {
        await socket.leave(roomForMarker(markerId));
        cb();
      });
    });
  }

  attachServer(server: http.Server) {
    this.io.attach(server);
  }

  emitSaved({ image, marker, comment }: Saved) {
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

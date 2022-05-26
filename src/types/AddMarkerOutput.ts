import { CommentDocument } from '../models';
import GetMarkerOutput from './GetMarkerOutput';

export default class AddMarkerOutput extends GetMarkerOutput {
  comment!: CommentDocument;
}

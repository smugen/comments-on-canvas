import { UserDocument } from '../models';

export default class AddUserOutput {
  user!: UserDocument;

  password!: string;
}

import { UserDocument } from '../models';

export default class SignInOutput {
  user!: UserDocument;

  cyToken!: string;
}

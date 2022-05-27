export default class SignInError extends Error {
  name = 'SignInError';

  constructor(username: string) {
    super(
      `Could not sign-in, The username '${username}' or password is incorrect.`,
    );
  }
}

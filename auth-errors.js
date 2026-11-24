export function getSignInErrorMessage(error) {
  return error?.message === 'Invalid login credentials'
    ? 'Invalid email or password'
    : 'Unable to sign in. Please try again.';
}

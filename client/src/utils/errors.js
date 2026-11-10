// Turns the server's validation list [{ field, message }] into { field: message }.
export function getFieldErrors(error) {
  const result = {};
  (error?.errors || []).forEach(({ field, message }) => {
    if (!result[field]) result[field] = message;
  });
  return result;
}

export function getErrorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.';
}

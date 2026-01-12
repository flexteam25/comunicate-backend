/**
 * Convert camelCase property name to natural language
 * Examples:
 * - displayName -> "Display Name"
 * - email -> "Email"
 * - birthDate -> "Birth Date"
 * - phoneNumber -> "Phone Number"
 */
export function propertyNameToNaturalLanguage(property: string): string {
  // Handle empty or null
  if (!property) {
    return property;
  }

  // Split camelCase: insert space before uppercase letters
  const spaced = property.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Capitalize first letter of each word
  return spaced
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

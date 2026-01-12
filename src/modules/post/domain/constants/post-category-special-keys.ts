export const POST_CATEGORY_SPECIAL_KEYS = ['popular'] as const;

export type PostCategorySpecialKey = (typeof POST_CATEGORY_SPECIAL_KEYS)[number];

export function isValidPostCategorySpecialKey(
  key: string | null | undefined,
): key is PostCategorySpecialKey {
  return (
    POST_CATEGORY_SPECIAL_KEYS.includes(key as PostCategorySpecialKey) ||
    key === null ||
    key === ''
  );
}

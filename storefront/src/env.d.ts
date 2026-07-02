/// <reference types="next" />
/// <reference types="next/image-types/global" />
/// <reference types="next/navigation-types/compat/navigation" />

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

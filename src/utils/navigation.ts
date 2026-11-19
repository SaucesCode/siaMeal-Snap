type BackRouter = { canGoBack: () => boolean; back: () => void; replace: (href: any) => void };

/** Back if there is a screen behind this one (there isn't after a reload or a deep link), else the fallback. */
export function goBackOr(router: BackRouter, fallback: string) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

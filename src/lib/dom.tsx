import * as React from 'react';
import { canUseDOM } from '@vkontakte/vkjs';
export { canUseDOM, canUseEventListeners, onDOMLoaded } from '@vkontakte/vkjs';

export interface DOMContextInterface {
  /**
   * @ignore
   */
  window?: Window;
  /**
   * @ignore
   */
  document?: Document;
}

export type DOMProps = DOMContextInterface;

export const getDOM = () => ({
  window: canUseDOM ? window : null,
  document: canUseDOM ? document : null,
});

export const DOMContext = React.createContext<DOMContextInterface>(getDOM());

export const useDOM = () => {
  const dom = React.useContext(DOMContext);
  return {
    window: dom.window || (canUseDOM ? window : null),
    document: dom.document || (canUseDOM ? document : null),
  };
};

export function withDOM<Props>(Component: React.ComponentType<Props & DOMProps>) {
  const WithDOM: React.FC<Props> = (props: Props) => {
    const dom = useDOM();
    return <Component {...props} {...dom} />;
  };
  return WithDOM;
}

export function blurActiveElement(document: Document | undefined) {
  if (document && document.activeElement) {
    (document.activeElement as HTMLElement).blur();
  }
}

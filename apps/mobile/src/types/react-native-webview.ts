import type React from "react";

export interface WebViewMessageEvent {
  nativeEvent: {
    data: string;
  };
}

export class WebView extends (null as unknown as React.ComponentClass<any>) {
  injectJavaScript(_script: string): void {}
}

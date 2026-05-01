import { FileRouter } from "@tamer4lynx/tamer-router";
import "@tamer4lynx/tamer-icons";
import "./tamer-app-routes.js";
import {
  DetailsRecoilProvider,
  detailsRecoilProviderConnector,
} from "./details-recoil-state.js";
import { useExamplePalette } from "./examplePalette.js";

const bridgeProviderConnector = [detailsRecoilProviderConnector];

export function FileRouterApp() {
  useExamplePalette();
  return (
    <DetailsRecoilProvider>
      <FileRouter providerConnector={bridgeProviderConnector} />
    </DetailsRecoilProvider>
  );
}

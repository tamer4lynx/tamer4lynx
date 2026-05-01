import { TamerStateSyncProvider, FileRouter } from "@tamer4lynx/tamer-router";
import "@tamer4lynx/tamer-icons";
import "./tamer-app-routes.js";
import { demoTamerStateSync } from "./demo-tamer-state.js";
import {
  DetailsRecoilProvider,
  detailsRecoilTamerStateSync,
} from "./details-recoil-state.js";
import { useExamplePalette } from "./examplePalette.js";

export function FileRouterApp() {
  useExamplePalette();
  return (
    <TamerStateSyncProvider
      syncs={[demoTamerStateSync, detailsRecoilTamerStateSync]}
    >
      <DetailsRecoilProvider>
        <FileRouter />
      </DetailsRecoilProvider>
    </TamerStateSyncProvider>
  );
}

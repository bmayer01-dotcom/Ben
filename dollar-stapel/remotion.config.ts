/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
// Verlustfreie Einzelbilder + hohe Bitrate, damit Schrift scharf bleibt
Config.setVideoImageFormat("png");
Config.setCrf(15);
Config.setX264Preset("slow");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);
// In dieser Umgebung vorinstalliertes Chromium nutzen (Remotion-Download ist blockiert).
if (process.env.REMOTION_CHROME) Config.setBrowserExecutable(process.env.REMOTION_CHROME);

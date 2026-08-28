import { Config } from "@remotion/cli/config";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";

Config.overrideWebpackConfig((currentConfig) => {
  return {
    ...currentConfig,
    resolve: {
      ...currentConfig.resolve,
      plugins: [
        ...(currentConfig.resolve?.plugins ?? []),
        new TsconfigPathsPlugin({
          configFile: "/Users/certideal/Desktop/montage-studio/tsconfig.json",
        }),
      ],
    },
  };
});

import { Config } from "@remotion/cli/config";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import path from "path";

Config.setPublicDir(path.join(__dirname, "public"));

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

type DjockeyConfig = {
  inputDir: string;
  htmlOutputDir: string;
};

function readConfig(): DjockeyConfig {
  return {
    inputDir: "docs",
    htmlOutputDir: "out/html",
  };
}

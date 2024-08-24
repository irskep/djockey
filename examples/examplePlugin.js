class ExamplePlugin {
  onPass_read(doc) {
    console.log("The example plugin is running on", doc.title);
  }
}
export const makePlugin = () => new ExamplePlugin();

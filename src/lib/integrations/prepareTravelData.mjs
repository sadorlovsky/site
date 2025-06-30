export const prepareTravelDataIntegration = () => ({
  name: "prepareTravelData",
  hooks: {
    "astro:build:start": async () => {
      console.log("WAIT SUKA BUILDING");
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log("NOW BUILD SUKA")
    },
  },
});

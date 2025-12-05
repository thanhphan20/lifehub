import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Lifehub",
  version: packageJson.version,
  copyright: `© ${currentYear}, Lifehub.`,
  meta: {
    title: "Lifehub - Your Personal Dashboard",
    description: "Lifehub is a personal dashboard that allows you to track your workouts, mental health, and more.",
  },
};

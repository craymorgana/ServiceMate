import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [react()],
	envDir: path.resolve(rootDir, ".."),
	resolve: {
		alias: {
			"@shared": path.resolve(rootDir, "../shared"),
			"@apollo/client": path.resolve(rootDir, "node_modules/@apollo/client"),
		},
	},
	server: {
		fs: {
			allow: [path.resolve(rootDir, "..")],
		},
		proxy: {
			"/graphql": "http://localhost:3001",
		},
	},
	test: {
		environment: "jsdom",
		setupFiles: "./src/test/setup.js",
	},
});

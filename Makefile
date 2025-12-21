.PHONY: build

build:
	@echo "Building TypeScript with esbuild..."
	@npx esbuild src/handlers/investment.ts \
		--bundle \
		--platform=node \
		--target=node20 \
		--format=esm \
		--outfile=.aws-sam/build/InvestmentFunction/handlers/investment.js \
		--external:@aws-sdk/* \
		--minify \
		--sourcemap


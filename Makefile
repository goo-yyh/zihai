.DEFAULT_GOAL := help

PNPM ?= pnpm
DEV_ENV_FILE ?= .env.local
PREVIEW_BRANCH ?= staging
VERCEL ?= vercel

.PHONY: \
	help install dev build start format format-check lint typecheck test check vercel-version \
	vercel-link db-generate db-check-development db-migrate-development \
	db-studio-development db-seed-development db-check-preview db-migrate-preview \
	db-check-production db-migrate-production admin-promote-development \
	admin-promote-preview admin-promote-production guard-email guard-production

help: ## 显示常用命令
	@awk 'BEGIN { FS = ":.*## "; printf "Usage: make <target> [VARIABLE=value]\n\n" } /^[a-zA-Z0-9_-]+:.*## / { printf "  %-30s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## 按锁文件安装依赖
	$(PNPM) install --frozen-lockfile

dev: ## 启动本地开发服务器
	$(PNPM) dev

build: ## 创建生产构建
	$(PNPM) build

start: ## 启动已生成的生产构建
	$(PNPM) start

format: ## 使用 Prettier 格式化项目
	$(PNPM) format

format-check: ## 检查项目格式
	$(PNPM) format:check

lint: ## 运行 ESLint
	$(PNPM) lint

typecheck: ## 生成路由类型并运行 TypeScript 检查
	$(PNPM) typecheck

test: ## 运行 Vitest
	$(PNPM) test

check: ## 运行完整质量门禁
	$(PNPM) check

vercel-version: ## 显示全局 Vercel CLI 版本
	$(VERCEL) --version

vercel-link: ## 首次将当前目录关联到 Vercel 项目
	$(VERCEL) link

db-generate: ## 使用 Development 配置生成数据库迁移
	DOTENV_CONFIG_PATH=$(DEV_ENV_FILE) $(PNPM) db:generate

db-check-development: ## 使用 .env.local 检查 Development 迁移
	DOTENV_CONFIG_PATH=$(DEV_ENV_FILE) $(PNPM) db:check

db-migrate-development: db-check-development ## 检查并迁移 Development 数据库
	DOTENV_CONFIG_PATH=$(DEV_ENV_FILE) $(PNPM) db:migrate

db-studio-development: ## 使用 Development 数据库启动 Drizzle Studio
	DOTENV_CONFIG_PATH=$(DEV_ENV_FILE) $(PNPM) db:studio

db-seed-development: ## 创建 10 个 Development 模拟用户及每人 2～4 个已发布项目
	CONFIRM_DEVELOPMENT_SEED=yes DOTENV_CONFIG_PATH=$(DEV_ENV_FILE) $(PNPM) db:seed

db-check-preview: ## 检查 Preview 迁移，默认读取 staging 分支变量
	$(VERCEL) env run -e preview --git-branch $(PREVIEW_BRANCH) -- $(PNPM) db:check

db-migrate-preview: db-check-preview ## 检查并迁移 Preview 数据库
	$(VERCEL) env run -e preview --git-branch $(PREVIEW_BRANCH) -- $(PNPM) db:migrate

db-check-production: ## 只读检查 Production 迁移
	$(VERCEL) env run -e production -- $(PNPM) db:check

db-migrate-production: guard-production ## 检查并迁移 Production 数据库，必须显式确认
	$(MAKE) db-check-production
	$(VERCEL) env run -e production -- $(PNPM) db:migrate

admin-promote-development: guard-email ## 在 Development 提升已有用户，传入 EMAIL=
	DOTENV_CONFIG_PATH=$(DEV_ENV_FILE) $(PNPM) admin:promote "$(EMAIL)"

admin-promote-preview: guard-email ## 在 Preview 提升已有用户，传入 EMAIL=
	$(VERCEL) env run -e preview --git-branch $(PREVIEW_BRANCH) -- $(PNPM) admin:promote "$(EMAIL)"

admin-promote-production: guard-email guard-production ## 在 Production 提升用户，必须显式确认
	$(VERCEL) env run -e production -- $(PNPM) admin:promote "$(EMAIL)"

guard-email:
	@if [ -z "$(EMAIL)" ]; then \
		echo "EMAIL is required. Example: make admin-promote-development EMAIL=admin@example.com"; \
		exit 1; \
	fi

guard-production:
	@if [ "$(CONFIRM_PRODUCTION)" != "yes" ]; then \
		echo "Refusing to mutate Production without explicit confirmation."; \
		echo "Re-run with CONFIRM_PRODUCTION=yes after verifying the target environment."; \
		exit 1; \
	fi

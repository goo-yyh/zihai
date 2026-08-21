.DEFAULT_GOAL := help

PNPM ?= pnpm
DEV_ENV_FILE ?= .env.local
PREVIEW_ENV_FILE ?= .env.preview
PRODUCTION_ENV_FILE ?= .env.production
PREVIEW_SITE_HOST ?= staging.zihai.dev
PRODUCTION_SITE_HOST ?= www.zihai.dev
VERCEL ?= vercel

DEVELOPMENT_ENV = env -u DATABASE_ENVIRONMENT -u DATABASE_URL -u BETTER_AUTH_URL -u RESEND_API_KEY -u AUTH_EMAIL_FROM -u NEXT_PUBLIC_SITE_URL DOTENV_CONFIG_PATH="$(DEV_ENV_FILE)"
PREVIEW_ENV = env -u DATABASE_ENVIRONMENT -u DATABASE_URL -u BETTER_AUTH_URL -u RESEND_API_KEY -u AUTH_EMAIL_FROM -u NEXT_PUBLIC_SITE_URL DOTENV_CONFIG_PATH="$(PREVIEW_ENV_FILE)"
PRODUCTION_ENV = env -u DATABASE_ENVIRONMENT -u DATABASE_URL -u BETTER_AUTH_URL -u RESEND_API_KEY -u AUTH_EMAIL_FROM -u NEXT_PUBLIC_SITE_URL DOTENV_CONFIG_PATH="$(PRODUCTION_ENV_FILE)"

.PHONY: \
	help install dev build start format format-check lint typecheck test check vercel-version \
	vercel-link db-generate db-check-development db-migrate-development \
	db-studio-development db-seed-development db-check-preview db-migrate-preview \
	db-check-production db-migrate-production admin-promote-development \
	admin-promote-preview admin-promote-production guard-development-env \
	guard-preview-env guard-production-env guard-email guard-production

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
	$(DEVELOPMENT_ENV) $(PNPM) db:generate

db-check-development: guard-development-env ## 使用 .env.local 检查 Development 迁移
	$(DEVELOPMENT_ENV) $(PNPM) db:check

db-migrate-development: db-check-development ## 检查并迁移 Development 数据库
	$(DEVELOPMENT_ENV) $(PNPM) db:migrate

db-studio-development: ## 使用 Development 数据库启动 Drizzle Studio
	$(DEVELOPMENT_ENV) $(PNPM) db:studio

db-seed-development: ## 创建 10 个 Development 模拟用户及每人 2～4 个已发布项目
	CONFIRM_DEVELOPMENT_SEED=yes $(DEVELOPMENT_ENV) $(PNPM) db:seed

db-check-preview: guard-preview-env ## 使用 .env.preview 检查 Preview 迁移
	$(PREVIEW_ENV) $(PNPM) db:check

db-migrate-preview: db-check-preview ## 检查并迁移 Preview 数据库
	$(PREVIEW_ENV) $(PNPM) db:migrate

db-check-production: guard-production-env ## 使用 .env.production 只读检查 Production 迁移
	$(PRODUCTION_ENV) $(PNPM) db:check

db-migrate-production: guard-production guard-production-env ## 检查并迁移 Production 数据库，必须显式确认
	$(MAKE) db-check-production
	$(PRODUCTION_ENV) $(PNPM) db:migrate

admin-promote-development: guard-email guard-development-env ## 在 Development 提升已有用户，传入 EMAIL=
	$(DEVELOPMENT_ENV) $(PNPM) admin:promote "$(EMAIL)"

admin-promote-preview: guard-email guard-preview-env ## 在 Preview 提升已有用户，传入 EMAIL=
	$(PREVIEW_ENV) $(PNPM) admin:promote "$(EMAIL)"

admin-promote-production: guard-email guard-production guard-production-env ## 在 Production 提升用户，必须显式确认
	$(PRODUCTION_ENV) $(PNPM) admin:promote "$(EMAIL)"

guard-development-env:
	@if [ ! -f "$(DEV_ENV_FILE)" ]; then \
		echo "Development environment file not found: $(DEV_ENV_FILE)"; \
		exit 1; \
	fi

guard-preview-env:
	@if [ ! -f "$(PREVIEW_ENV_FILE)" ]; then \
		echo "Preview environment file not found: $(PREVIEW_ENV_FILE)"; \
		exit 1; \
	fi
	@$(PREVIEW_ENV) $(PNPM) exec tsx scripts/check-database-target.ts preview "$(PREVIEW_SITE_HOST)"

guard-production-env:
	@if [ ! -f "$(PRODUCTION_ENV_FILE)" ]; then \
		echo "Production environment file not found: $(PRODUCTION_ENV_FILE)"; \
		echo "Create it from a trusted secret source; Vercel Sensitive values cannot be exported by env pull/run."; \
		exit 1; \
	fi
	@$(PRODUCTION_ENV) $(PNPM) exec tsx scripts/check-database-target.ts production "$(PRODUCTION_SITE_HOST)"

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

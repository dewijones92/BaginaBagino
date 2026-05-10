.PHONY: doctor install gen test test-server test-client lint clean dev-server dev-client emulator playtest deploy-pi help

# Toolchain paths (override with env if needed)
FLUTTER_BIN ?= /home/dewi/code/flutter/bin/flutter
ANDROID_SDK ?= /home/dewi/code/android-sdk
ADB         ?= $(ANDROID_SDK)/platform-tools/adb
EMULATOR    ?= $(ANDROID_SDK)/emulator/emulator
AVD_NAME    ?= baginoapp-dewi
EMU_PORT    ?= 5582
DEVICE_ID   ?= emulator-$(EMU_PORT)
PI_HOST     ?= pi@333133333.xyz

help:
	@echo "Bagino Bagina — top-level make targets"
	@echo "  make doctor       — verify toolchain"
	@echo "  make install      — pnpm install + flutter pub get"
	@echo "  make gen          — regenerate wire types and theme"
	@echo "  make test         — run all tests"
	@echo "  make dev-server   — run server with watch"
	@echo "  make dev-client   — run flutter on emulator"
	@echo "  make emulator     — boot the bagino AVD headless"
	@echo "  make playtest     — server + 4 simulated clients to completion"
	@echo "  make deploy-pi    — deploy server container to Pi"

doctor:
	@echo "::flutter:: " && $(FLUTTER_BIN) --version | head -1
	@echo "::pnpm::    " && pnpm --version
	@echo "::node::    " && node --version
	@echo "::adb::     " && $(ADB) version | head -1
	@echo "::kvm::     " && [ -r /dev/kvm ] && echo "OK" || (echo "FAIL — /dev/kvm not readable" && exit 1)
	@echo "::emulator-accel::" && $(EMULATOR) -accel-check 2>&1 | grep -qi "usable" && echo "OK" || (echo "FAIL" && exit 1)
	@echo "::avd::     " && $(ANDROID_SDK)/cmdline-tools/latest/bin/avdmanager list avd | grep -q "Name: $(AVD_NAME)" && echo "OK ($(AVD_NAME))" || (echo "FAIL — AVD '$(AVD_NAME)' missing" && exit 1)
	@echo "::pi-ssh:: " && ssh -o ConnectTimeout=5 -o BatchMode=yes $(PI_HOST) 'echo OK' 2>/dev/null || echo "WARN — Pi unreachable (only needed for deploy)"

install:
	pnpm install
	cd client && $(FLUTTER_BIN) pub get

gen:
	pnpm --filter @bagina/schema run gen
	pnpm --filter @bagina/theme run gen

test: test-server test-client

test-server:
	pnpm --filter server run test

test-client:
	cd client && $(FLUTTER_BIN) test

lint:
	pnpm -r run lint
	cd client && $(FLUTTER_BIN) analyze

dev-server:
	pnpm --filter server run dev

dev-client:
	bash scripts/dev-client.sh emulator

emulator:
	bash scripts/run-emulator.sh

emulator-stop:
	bash scripts/stop-emulator.sh

playtest:
	bash scripts/playtest.sh

deploy-pi:
	bash infra/pi/deploy.sh

clean:
	rm -rf node_modules packages/*/node_modules packages/*/dist server/node_modules server/dist
	cd client && $(FLUTTER_BIN) clean

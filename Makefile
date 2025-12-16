.PHONY: serve clean

PORT ?= 8888

serve:
	@echo "Starting local server on http://localhost:$(PORT)"
	python3 -m http.server $(PORT)

clean:
	@echo "Nothing to clean"

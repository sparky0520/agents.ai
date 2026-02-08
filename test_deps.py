try:
    import langgraph

    print("langgraph imported successfully")
except ImportError as e:
    print(f"Failed to import langgraph: {e}")

try:
    import pydantic

    print("pydantic imported successfully")
except ImportError as e:
    print(f"Failed to import pydantic: {e}")

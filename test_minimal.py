print("Hello from python")
import sys

print(sys.executable)
try:
    import langgraph

    print("Langgraph imported")
except Exception as e:
    print(e)

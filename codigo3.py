import time

start_time = time.time()

while True:
    elapsed = time.time() - start_time
    print(f"Hello, World! 3 - {elapsed:.1f}s")
    
    if elapsed >= 10:
        print("ERROR: Simulando crash del proceso!")
        raise Exception("Crash intencional después de 10 segundos")
    
    time.sleep(5)
import sys

# Verificar que se recibieron exactamente 2 parámetros (además del nombre del script)
if len(sys.argv) != 3:
    print(f"Error: Se esperaban 2 parámetros, pero se recibieron {len(sys.argv) - 1}")
    print(f"Uso: python {sys.argv[0]} <parametro1> <parametro2>")
    sys.exit(1)

# Obtener los parámetros
param1 = sys.argv[1]
param2 = sys.argv[2]

# Imprimir los parámetros
print(f"Parámetro 1: {param1}")
print(f"Parámetro 2: {param2}")

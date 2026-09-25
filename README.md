# Control de Grupos y Préstamos

Una aplicación web para administrar grupos de préstamos con control de pagos semanales.

## Funcionalidades

- Registrar grupos.
- Registrar personas dentro de cada grupo.
- Ingresar monto prestado, interés total y fecha de entrega.
- Generar automáticamente 12 pagos semanales a partir de la fecha otorgada.
- Mostrar el desglose de cada cuota: pago, capital, interés, saldo y fecha.
- Marcar si cada cuota fue pagada o no.
- Mantener la información en el navegador con `localStorage`.

## Cómo usar

1. Abre `index.html` directamente en el navegador o despliega este proyecto en GitHub Pages.
2. Crea un grupo.
3. Agrega a cada persona con su monto, interés y fecha de entrega.
4. Revisa la tabla de pagos y marca los pagos realizados.

## Ejemplo incluido

La aplicación ya viene con un ejemplo basado en el caso real de un préstamo de $10,000 con $2,000 de interés y 12 pagos semanales.

## Archivos principales

- `index.html` — estructura principal
- `styles.css` — estilos visuales
- `app.js` — lógica de grupos, préstamos y cálculo de pagos

## Nota

Como es una aplicación estática, no requiere backend ni base de datos externa. Todo se guarda en el navegador.

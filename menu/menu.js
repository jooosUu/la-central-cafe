// Carta de La Central Café (misma estructura que el menú en Illustrator). Precios en COP.
// model: archivo en models/ (modelos DE PRUEBA: se reemplazan por los reales con el mismo nombre)
export const COMBO = ['+papa criolla', '+coca zero 250ml'];

export const MENU = [
  {
    id: 'cafe-de-dia', titulo: 'café de día',
    bloques: [
      {
        tipo: 'lista', id: 'cafes', subtitulo: 'Café', horario: 'dia',
        items: [
          { id: 'tinto-greca', nombre: 'Tinto greca', precio: 1500 },
          { id: 'perico', nombre: 'Perico', precio: 2500 },
          { id: 'cafe-leche', nombre: 'Café leche', precio: 4000 },
          { id: 'aromatica-sobre', nombre: 'Aromáticas sobre', precio: 1500 },
          { id: 'aromatica-frutas', nombre: 'Aromáticas con frutas', precio: 3500 },
          { id: 'expreso', nombre: 'Expreso (máquina)', precio: 3000 },
          { id: 'americano', nombre: 'Americano (máquina)', precio: 4000 },
          { id: 'capuchino', nombre: 'Capuchino (máquina)', precio: 5000 },
        ],
      },
      {
        tipo: 'lista', id: 'horneados', subtitulo: 'Horneados', horario: 'dia',
        items: [
          { id: 'empanadas-horneadas', nombre: 'Empanadas', precio: 3500 },
          { id: 'pastel-pollo', nombre: 'Pastel de pollo', precio: 3500 },
          { id: 'pastel-hawaiano', nombre: 'Pastel hawaiano', precio: 3500 },
          { id: 'torta-vino', nombre: 'Torta de vino porción grande', precio: 6000 },
          { id: 'mantecada', nombre: 'Mantecada porción', precio: 3000 },
          { id: 'brazo-de-reina', nombre: 'Brazo de Reina', precio: 3000 },
        ],
      },
    ],
  },
  {
    id: 'choripan', titulo: 'choripan',
    bloques: [
      {
        tipo: 'destacado', horario: 'noche',
        items: [
          {
            id: 'choripan', nombre: 'Choripan', precio: 13000, combo: 17000, model: 'choripan',
            desc: 'Pan baguette de ajo, chorizo artesanal asado a la parrilla, chimichurri de la casa y ese sabor ahumado que nos representa.',
          },
          {
            id: 'chori-doble', nombre: 'Chori-doble', precio: 20000, combo: 24000, model: 'chori-doble',
            desc: 'Pan baguette de ajo, doble chorizo artesanal asado a la parrilla, chimichurri de la casa y ese sabor ahumado que nos representa.',
          },
        ],
      },
      {
        tipo: 'lista', id: 'adiciones', subtitulo: 'Adiciones', horario: 'noche',
        items: [
          { id: 'aguacate', nombre: 'Aguacate', precio: 2000, model: 'aguacate' },
          { id: 'queso', nombre: 'Queso', precio: 2000, model: 'queso' },
        ],
      },
    ],
  },
  {
    id: 'fuego-de-noche', titulo: 'fuego de noche',
    bloques: [
      {
        tipo: 'lista', id: 'parrilla', subtitulo: 'De la parrilla', horario: 'noche',
        items: [
          { id: 'alitas', nombre: 'Alitas', precio: 0, desc: 'Lulo, maracuyá o BBQ.' },
          { id: 'costillas-bbq', nombre: 'Costillas BBQ', precio: 0 },
          { id: 'sandwich', nombre: 'Sándwich', precio: 0 },
          { id: 'nachos', nombre: 'Nachos', precio: 0 },
        ],
      },
    ],
  },
  {
    id: 'bebidas', titulo: 'bebidas',
    bloques: [
      {
        tipo: 'lista', id: 'cervezas', subtitulo: 'Cervezas', horario: 'siempre',
        items: [
          { id: 'stella', nombre: 'Stella Artois', precio: 5000, model: 'stella' },
          { id: 'solecita', nombre: 'Solecita', precio: 4500, model: 'solecita' },
          { id: 'coronita', nombre: 'Coronita', precio: 4000, model: 'coronita' },
          { id: 'club-dorada', nombre: 'Club Dorada', precio: 4000 },
          { id: 'aguila', nombre: 'Aguila', precio: 3500, model: 'aguila' },
          { id: 'poker', nombre: 'Poker', precio: 3500, model: 'poker' },
        ],
      },
      {
        tipo: 'lista', id: 'sin-alcohol', subtitulo: 'Sin alcohol', horario: 'siempre',
        items: [
          { id: 'coca-250', nombre: 'Coca Mini 250 ml', precio: 2500, model: 'coca-250' },
          { id: 'coca-zero-250', nombre: 'Coca Mini Zero 250 ml', precio: 2500 },
          { id: 'coca-400', nombre: 'Coca-Cola 400ml', precio: 4000, model: 'coca-400' },
          { id: 'gaseosa-postobon-250', nombre: 'Gaseosa 250 ml Postobón', precio: 2000 },
          { id: 'gaseosa-postobon-400', nombre: 'Gaseosa 400 ml Postobón', precio: 4000 },
          { id: 'pony-mini-250', nombre: 'Pony Mini 250 ml', precio: 2500 },
          { id: 'pony-malta-330', nombre: 'Pony Malta 330 ml', precio: 3500 },
          { id: 'jugo-hit-500', nombre: 'Jugo Hit 500 ml', precio: 3500 },
          { id: 'soda-hatsu', nombre: 'Soda HATSU', precio: 4500, model: 'soda-hatsu' },
          { id: 'te-hatsu', nombre: 'Te HATSU', precio: 7000, model: 'te-hatsu' },
          { id: 'agua-pequena-300', nombre: 'Agua pequeña 300 ml', precio: 1500 },
          { id: 'agua', nombre: 'Agua Cristal 600ml', precio: 2500, model: 'agua' },
          { id: 'agua-gas-600', nombre: 'Agua Cristal con gas 600 ml', precio: 2700 },
          { id: 'agua-litro', nombre: 'Agua Cristal Litro', precio: 3000 },
          { id: 'bretana', nombre: 'Bretaña', precio: 3500 },
          { id: 'power', nombre: 'Power', precio: 3500 },
          { id: 'gatorade-500', nombre: 'Gatorade 500 ml', precio: 4500 },
          { id: 'gatorade-zero-500', nombre: 'Gatorade Zero 500 ml', precio: 4500 },
          { id: 'speed-botella-250', nombre: 'Speed botella 250', precio: 2500 },
          { id: 'speed-lata', nombre: 'Speed lata', precio: 3000 },
          { id: 'vive-100', nombre: 'Vive 100', precio: 2500 },
          { id: 'red-bull-lata', nombre: 'Red bull lata', precio: 8800 },
        ],
      },
    ],
  },
  {
    id: 'de-la-casa', titulo: 'de la casa',
    bloques: [
      {
        tipo: 'lista', id: 'ajies', subtitulo: 'Ajíes de la casa', horario: 'siempre',
        items: [
          { id: 'aji-maracuya', nombre: 'Ají maracuyá (tarro)', precio: 20000 },
          { id: 'aji-lulo', nombre: 'Ají lulo (tarro)', precio: 20000 },
          { id: 'aji-chorizo', nombre: 'Ají chorizo (tarro)', precio: 24000 },
        ],
      },
    ],
  },
  {
    id: 'mecato-y-otros', titulo: 'mecato y otros',
    bloques: [
      {
        tipo: 'lista', id: 'paquetes', subtitulo: 'Paquetes', horario: 'siempre',
        items: [
          { id: 'cheetos', nombre: 'Cheetos', precio: 3000 },
          { id: 'detodito', nombre: 'Detodito', precio: 3000 },
          { id: 'choklitos', nombre: 'Choklitos', precio: 2500 },
          { id: 'tostacos-picantes', nombre: 'Tostacos picantes', precio: 2800 },
          { id: 'papas-margarita', nombre: 'Papas Margarita', precio: 2500 },
          { id: 'natuchips', nombre: 'Natuchips', precio: 2500 },
          { id: 'doritos', nombre: 'Doritos', precio: 3000 },
          { id: 'mani-moto-limon', nombre: 'Maní Moto Limón', precio: 2500 },
          { id: 'mani-moto-natural', nombre: 'Maní Moto Natural', precio: 2500 },
        ],
      },
      {
        tipo: 'lista', id: 'ponques', subtitulo: 'Ponqués y galletas', horario: 'siempre',
        items: [
          { id: 'club-social', nombre: 'Club Social', precio: 1200 },
          { id: 'chokis', nombre: 'Chokis', precio: 2000 },
          { id: 'ponque-gala', nombre: 'Ponqué Gala', precio: 2500 },
          { id: 'chocorramo-tajada', nombre: 'Chocorramo tajada (grande)', precio: 3200 },
          { id: 'chocorramo-miti', nombre: 'Chocorramo miti (mediano)', precio: 2500 },
          { id: 'chocorramo-brownie', nombre: 'Chocorramo Brownie', precio: 4000 },
          { id: 'barrita-chocorramo', nombre: 'Barrita de chocorramo', precio: 2500 },
          { id: 'gansito', nombre: 'Gansito', precio: 2500 },
        ],
      },
      {
        tipo: 'lista', id: 'dulces', subtitulo: 'Dulces y chicles', horario: 'siempre',
        items: [
          { id: 'halls-x1', nombre: 'Halls x1', precio: 200 },
          { id: 'halls-barra', nombre: 'Halls barra', precio: 2400 },
          { id: 'trident-x1', nombre: 'Trident x1', precio: 300 },
          { id: 'trident-x3', nombre: 'Trident x3', precio: 1200 },
          { id: 'trident-x5', nombre: 'Trident x5', precio: 2200 },
          { id: 'chiclets-x2', nombre: 'Chiclets x2', precio: 300 },
          { id: 'chocolatina-jet', nombre: 'Chocolatina JET', precio: 1300 },
          { id: 'bombombum', nombre: 'Bombombum', precio: 700 },
          { id: 'sparkies', nombre: 'Sparkies', precio: 300 },
          { id: 'milka-oreo', nombre: 'Milka Oreo', precio: 2300 },
        ],
      },
      {
        tipo: 'lista', id: 'otros', subtitulo: 'Otros', horario: 'siempre',
        items: [
          { id: 'cigarrillos', nombre: 'Cigarrillos', precio: 1300 },
        ],
      },
    ],
  },
];

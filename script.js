import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, updateDoc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBmnUB4mhZoM9iugu-GrfnfXi1-LwrLP7I",
    authDomain: "stocky-afiliados.firebaseapp.com",
    projectId: "stocky-afiliados",
    storageBucket: "stocky-afiliados.appspot.com",
    messagingSenderId: "956724532974",
    appId: "1:956724532974:web:2ce7cab2141e4c807a45ff",
    measurementId: "G-ELFRKVQ7W9"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let carrito = [];
let precio = 0
let maneProduct = ''
let comision = 0
let plataforma = ''
let telefonoAfiliado = ''
let nombreAfiliado = ''
let nuevaVenta = {}
let atributos = []
let variantes = []
let precioProv = 0
const modal = document.querySelector('.modal');

let productData


document.addEventListener('DOMContentLoaded', () => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);

    // Leer los parámetros
    const proValue = params.get('PRO');
    const aflValue = params.get('AFL');

    localStorage.setItem('productoID', proValue);
    localStorage.setItem('afiliadoProducto', aflValue);

    // Llamar la función para obtener y mostrar el producto
    if (proValue) {
        obtenerProductoPorID(localStorage.getItem('productoID'));
        obtenerDataAfiliado(localStorage.getItem('afiliadoProducto'));
    } else {
        console.log("No se proporcionó ID de producto.");
    }
});

// FIREBASE

async function obtenerDataAfiliado(afiliadoId) {
    const afiliado = doc(db, 'afiliados', afiliadoId);
    const afiliadoDoc = await getDoc(afiliado);

    if (!afiliadoDoc.exists()) {
        console.error("No se encontró el documento de configuración");
        return;
    }

    telefonoAfiliado = afiliadoDoc.data().telefono;
    nombreAfiliado = afiliadoDoc.data().nombre;
    // const whatsappLink = document.getElementById('whatsapp-link');
    // whatsappLink.href = `https://wa.me/+573124360543`;
}

async function obtenerProductoPorID(productoID) {
    document.querySelector('#spinner').style.display = 'flex';
    try {
        const response = await fetch(`https://ms-public-api.rocketfy.com/rocketfy/api/v1/products?id=${productoID}`, {
            headers: {
                'x-api-key': 'OhnnILQdYFQjaePagghzG7EKnIcSt7qjgYD3Qa0bbG0=',
                'x-secret': 'b7e49cfa3db4dfe8ebae7cd052996011713f186e5fa51bb706c574bf08aa922a3b20015ffb594c68281b72df3e3d9f7f25651283042e72da2cdcead1eb84b185.f71dddc43729ad31'
            }
        });

        const producto = await response.json();
        if (producto) {
            printHTML(producto[0]);
            productData = producto[0]
            atributos = producto[0].attributes
            precio = producto[0].price
            variantes = producto[0].variations[0]
            maneProduct = producto[0].name
            // precioProv = producto[0].warehouse.warehouse_price
        } else {
            console.log("Producto no encontrado.");
        }
    } catch (error) {
        console.error("Error al obtener el producto:", error);
    } finally {
        document.querySelector('#spinner').style.display = 'none';
    }
}

function obtenerIdAfiliado() {
    const idAfiliado = localStorage.getItem('afiliadoProducto');
    if (!idAfiliado || idAfiliado === 'null') {
        console.error("No se encontró el ID del afiliado");
        return null;
    }
    return idAfiliado;
}

async function obtenerConfiguracionGeneral() {
    const configDocRef = doc(db, 'config', '0U4Ay0b1TlGi6rLw5sy3');
    const configDoc = await getDoc(configDocRef);

    if (!configDoc.exists()) {
        console.error("No se encontró el documento de configuración");
        return null;
    }

    return configDoc.data();
}

function calcularComisionVenta(totalAmount, comissionRate) {
    if (typeof comissionRate !== 'number') {
        console.error("El valor de la comisión por defecto no es un número");
        return null;
    }
    return (totalAmount * comissionRate) / 100;
}

async function guardarVenta(venta) {
    try {

        const ventasRef = collection(db, 'ventas');
        const docRef = await addDoc(ventasRef, venta);
        sendMail(venta)
    } catch (error) {
        console.error("Error al guardar la venta:", error);
    }
}

async function obtenerDatosAfiliado(idAfiliado) {
    const afiliadoRef = doc(db, 'afiliados', idAfiliado);
    const afiliadoDoc = await getDoc(afiliadoRef);

    if (!afiliadoDoc.exists()) {
        console.error("No se encontró el documento del afiliado");
        return null;
    }

    return afiliadoDoc.data();
}

async function actualizarDatosAfiliado(idAfiliado, nuevaComision, nuevaVenta) {
    const afiliadoRef = doc(db, 'afiliados', idAfiliado);
    await updateDoc(afiliadoRef, {
        comisionAcumulada: nuevaComision,
        ventasGeneradas: nuevaVenta
    });
}

async function procesarComisionReferente(idAfiliado, venta) {
    try {
        // Obtener los datos del afiliado actual
        const afiliadoRef = doc(db, 'afiliados', idAfiliado);
        const afiliadoDoc = await getDoc(afiliadoRef);

        if (!afiliadoDoc.exists()) {
            console.error("No se encontró el documento del afiliado");
            return;
        }

        const afiliadoData = afiliadoDoc.data();
        const idAfiliadoReferente = afiliadoData.afiliadoReferente;

        // Si no existe un afiliado referente, no se hace nada
        if (!idAfiliadoReferente) {
            return;
        }

        // Obtener el porcentaje de comisión para el afiliado referente
        const configDocRef = doc(db, 'config', '0U4Ay0b1TlGi6rLw5sy3');
        const configDoc = await getDoc(configDocRef);

        if (!configDoc.exists()) {
            console.error("No se encontró el documento de configuración");
            return;
        }

        const comissionRateReferente = configDoc.data().default_comission_rate_referent;
        if (typeof comissionRateReferente !== 'number') {
            console.error("El valor de la comisión para el referente no es un número");
            return;
        }

        // Calcular la comisión del referente
        const comisionReferente = (venta.totalAmount * comissionRateReferente) / 100;

        // Restar la comisión del referente de la comisión del afiliado actual
        venta.comisionAfiliado -= comisionReferente;

        // Actualizar la comisión del referente en su propio documento de afiliado
        const referenteRef = doc(db, 'afiliados', idAfiliadoReferente);
        const referenteDoc = await getDoc(referenteRef);

        if (!referenteDoc.exists()) {
            console.error("No se encontró el documento del afiliado referente");
            return;
        }

        const referenteData = referenteDoc.data();
        const comisionSubafiliadosActual = referenteData.comisionSubafiliados || 0;
        const comisionAcumuladaReferenteActual = referenteData.comisionAcumulada || 0;
        const ventasGeneradasReferenteActual = referenteData.ventasGeneradas || 0;

        // Actualizar la comisión del subafiliado y la comisión acumulada del referente
        await updateDoc(referenteRef, {
            comisionSubafiliados: comisionSubafiliadosActual + comisionReferente,
            comisionAcumulada: comisionAcumuladaReferenteActual + comisionReferente,
            ventasGeneradas: ventasGeneradasReferenteActual + 1
        });

        // Actualizar la subcolección de subafiliados
        const subafiliadoRef = doc(db, 'afiliados', idAfiliadoReferente, 'subAfiliados', idAfiliado);
        // Actualizar los campos de la subcolección 'subafiliados'
        await updateDoc(subafiliadoRef, {
            comisionSubafiliados: comisionSubafiliadosActual + comisionReferente,
            comisionAcumulada: comisionAcumuladaReferenteActual + comisionReferente,
            ventasGeneradas: ventasGeneradasReferenteActual + 1
        });

        console.log(`Comisión de subafiliado actualizada para el afiliado referente: ${idAfiliadoReferente}`);

    } catch (error) {
        console.error("Error al procesar la comisión del afiliado referente:", error);
    }
}

async function registrarVentaAfiliado(venta) {
    try {
        // Obtener ID del afiliado
        const idAfiliado = obtenerIdAfiliado();
        if (!idAfiliado) return;

        // Obtener configuración general (comisión)
        const configGeneral = await obtenerConfiguracionGeneral();
        if (!configGeneral) return;

        // Calcular la comisión de la venta
        const comissionRate = configGeneral.default_comission_rate;
        const comisionAfiliado = calcularComisionVenta(venta.totalAmount, comissionRate);
        if (!comisionAfiliado) return;

        // Calcular la comisión de la venta
        const comissionRateRef = configGeneral.default_comission_rate_referent;
        const comisionAfiliadoRef = calcularComisionVenta(venta.totalAmount, comissionRateRef);
        if (!comisionAfiliadoRef) return;

        // Asignar la comisión al objeto venta
        venta.comisionAfiliado = comisionAfiliado;
        venta.comisionReferente = comisionAfiliadoRef;

        // Guardar la venta en la base de datos
        await guardarVenta(venta, idAfiliado);

        // Procesar comisión del afiliado referente si existe
        await procesarComisionReferente(idAfiliado, venta);

        // Obtener datos actuales del afiliado
        const afiliadoData = await obtenerDatosAfiliado(idAfiliado);
        if (!afiliadoData) return;

        // Calcular nuevos valores de comisionAcumulada y ventasGeneradas
        const nuevaComisionAcumulada = (afiliadoData.comisionAcumulada || 0) + venta.comisionAfiliado;
        const nuevasVentasGeneradas = (afiliadoData.ventasGeneradas || 0) + 1;

        // Actualizar los datos del afiliado
        await actualizarDatosAfiliado(idAfiliado, nuevaComisionAcumulada, nuevasVentasGeneradas);

        carrito = []

        return venta;

    } catch (error) {
        console.error("Error al registrar la venta en Firebase:", error);
    }
}

async function crearOrden() {

    // const idAfiliado = localStorage.getItem('afiliadoProducto');
    // if (!idAfiliado || idAfiliado == 'null') {
    //     console.error("No se encontró el ID del afiliado");
    //     return;
    // }

    // Obtener valores de los inputs
    const departamento = document.getElementById('departamento').value;
    const ciudad = document.getElementById('ciudad').value;
    const direccion = document.getElementById('direccion').value;
    const barrio = document.getElementById('barrio').value;
    const notas = document.getElementById('nota').value;
    const nombres = document.getElementById('nombres').value;
    const apellidos = document.getElementById('apellidos').value;
    const telefono = document.getElementById('telefono').value;
    const correo = document.getElementById('correo').value;

    // Crear el objeto raw
    const raw = {
        name: nombres,
        lastName: apellidos,
        email: correo,
        courrier: "",
        destinationBilling: {
            address: direccion,
            city: ciudad,
            department: departamento,
            neighborhood: barrio,
            phone: telefono
        },
        products: carrito.map(product => ({
            identifier: String(product.id),
            quantity: product.cantidad,
            price: Number(precio)
        })),
        note: notas,
        confirm: false,
        date: Date().toString(),
        state: 'Pendiente',
        nameProduct: maneProduct,
        // affiliate_id: idAfiliado,
        totalAmount: carrito.reduce((total, product) => total + (precio * product.cantidad), 0)
    };

    document.querySelector('#carrito-items').innerHTML = ''
    document.querySelector('#carrito-items').textContent = 'Creando tu pedido...'

    try {
        guardarVenta(raw)
        // registrarVentaAfiliado(raw)
        msgVentaExitosa();
    } catch (error) {
        console.log(error);
    }

}

function sendMail(raw) {
    try {
        const totalQuantity = carrito.reduce((total, product) => total + product.cantidad, 0);
        emailjs.send("service_ort2wvz", "template_g639s5i", {
            to_name: raw.name + ' ' + raw.lastName,
            from_name: 'Stocky Colombia',
            quantity: totalQuantity,
            nameProduct: maneProduct,
            //  telefonoAfiliado: telefonoAfiliado,
            //  nombreAfiliado: nombreAfiliado,
            precio: precio,
            total_amount: raw.totalAmount,
            address: `${raw.destinationBilling.address}, ${raw.destinationBilling.neighborhood}, ${raw.destinationBilling.city}, ${raw.destinationBilling.department}`,
            phone: raw.destinationBilling.phone,
            note: raw.note,
            reply_to: raw.email
        });
    } catch (error) {
        console.log(error);
    }
}





function convertirURLsEnElementos(texto) {
    // Expresiones regulares para detectar diferentes tipos de contenido
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
    const youtubeShortsRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([\w-]{11})/;
    const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/video\/|player\.vimeo\.com\/video\/)(\d+)/;
    const gifRegex = /https?:\/\/.*\.(gif)/;
    const imageRegex = /https?:\/\/.*\.(jpg|jpeg|png|webp)/;

    return texto.replace(urlRegex, function (url) {
        // Limpia la URL eliminando cualquier etiqueta HTML, como </p>
        const cleanUrl = url.replace(/<\/?p>/gi, '');

        if (youtubeRegex.test(cleanUrl)) {
            const videoID = cleanUrl.match(youtubeRegex)[1];
            return `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${videoID}?controls=0&modestbranding=1&rel=0&autohide=1&iv_load_policy=3&fs=0" frameborder="0" allowfullscreen></iframe>`;
        }
        if (youtubeShortsRegex.test(cleanUrl)) {
            const videoID = cleanUrl.match(youtubeShortsRegex)[1];
            return `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${videoID}?controls=0&modestbranding=1&rel=0&showinfo=0&autohide=1&iv_load_policy=3&fs=0&playsinline=1" frameborder="0" allowfullscreen></iframe>`;
        }

        if (vimeoRegex.test(cleanUrl)) {
            const videoID = cleanUrl.match(vimeoRegex)[1];
            return `<iframe width="100%" height="400" src="https://player.vimeo.com/video/${videoID}?badge=0&autopause=0" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
        }

        if (gifRegex.test(cleanUrl)) {
            return `<img src="${cleanUrl}" alt="GIF del producto" width="300" class="gif-producto">`;
        }
        if (imageRegex.test(cleanUrl)) {
            return `<img src="${cleanUrl}" alt="imagen del producto" width="300">`;
        }

        return `<a href="${cleanUrl}" target="_blank">${cleanUrl}</a>`;
    });
}

function printHTML(producto) {
    //  console.log(producto);

    // Agregar SEO
    SEO(producto)

    // Agregar multimedia
    const descripcionConElementos = convertirURLsEnElementos(producto.description);

    document.querySelector('#content').innerHTML = `
    <header class="hero-section">
        <h1>${producto.name}</h1>
        <img src="${producto.imagePrin.location}" alt="banner" width="350" id="bannerurl">
        <p class="price" id="price"> ${producto.price} </p>
        <button class="order-btn">COMPRAR AHORA</button>
        <ul class="features">
            <li>¡No te quedes sin el tuyo! Compra ahora y aprovecha nuestras ofertas especiales.</li> <br>
            <li>Envío gratis a toda Colombia</li>
            <li>Pago contraentrega</li>
        </ul>
    </header>

    <section class="colors-section">
        <h2 id="textoSelecciona"></h2>
        <div class="color-options" id="color-options"></div> <br>
        <button class="order-btn">LO QUIERO!</button>
    </section>

    <section class="battery-section">
        <h2 id="tituloDescripcion">
            ${producto.attributes.map(atr => atr.subname).join(', ')}
        </h2>
        <div class="battery-features">
            <p id="decripcionPrincipal">
                ${producto.attributes.map(atr => atr.items.map(doc => doc.name).join(', ')).join(' ')}
            </p>
        </div>
    </section>

    <section class="description-general">
        <h2>Descripción General</h2>
        ${descripcionConElementos}
        <button class="order-btn">OBTÉN EL TUYO</button>
    </section>

    <section class="warranty-section">
        <h2 id="tituloGarantia">Nuestra Garantía</h2>
        <p id="descripcionGarantia"><i class="fa-solid fa-check" class="icon-garantia"></i> Contamos con ${producto.warranty} ${producto.warranty > 1 ? 'meses' : 'mes'} de Garantía</p>
    </section>

    <section class="shipping-section">
        <img src="https://content.app-sources.com/s/34404626044879487/thumbnails/640x480/Images/Recurso_30-0217029.png?format=webp" alt="envío gratis">
    </section>
    `;

    actualizarOpcionesColor(producto);
    configurarCompraContraEntrega();
}

function SEO(producto) {
    // Actualizar dinámicamente las etiquetas SEO en el <head>
    document.title = `${producto.name} - Compra ahora a un precio increíble`;

    // Meta descripción
    document.querySelector('meta[name="description"]').setAttribute('content', `Compra ${producto.name}. Disfruta de ${producto.attributes.map(atr => atr.subname).join(', ')}. Envío gratis a toda Colombia y pago contra entrega.`);

    // Meta keywords
    document.querySelector('meta[name="keywords"]').setAttribute('content', `${producto.name}, compra auriculares, pago contra entrega, envío gratis, ${producto.attributes.map(atr => atr.subname).join(', ')}`);

    // Open Graph tags
    document.querySelector('meta[property="og:title"]').setAttribute('content', `${producto.name} - Compra ahora`);
    document.querySelector('meta[property="og:description"]').setAttribute('content', `Compra ${producto.name} con características como ${producto.attributes.map(atr => atr.items.map(doc => doc.name).join(', ')).join(' ')} y envío gratis.`);
    document.querySelector('meta[property="og:image"]').setAttribute('content', `${producto.imagePrin.location}`);
    document.querySelector('meta[property="og:url"]').setAttribute('content', window.location.href);
}

function actualizarOpcionesColor(producto) {
    const colorOptions = document.querySelector('#color-options');
    colorOptions.innerHTML = '';  // Limpiar opciones previas

    producto.images.forEach((variantes, index) => {
        const imgElement = crearImagenVariante(variantes, index);
        colorOptions.appendChild(imgElement);
    });
}

function crearImagenVariante(variantes, index) {
    const imgElement = document.createElement('img');
    imgElement.id = `product-stocky-${variantes.key}`;
    imgElement.src = variantes.location;
    imgElement.alt = `producto ${index + 1}`;
    imgElement.style.cursor = 'pointer';


    return imgElement;
}

function configurarCompraContraEntrega() {
    const comprarBtn = document.querySelectorAll('.order-btn');
    comprarBtn.forEach(btn => {
        btn.addEventListener('click', function () {
            mostrarModalCarrito();
        });
    })
}

function mostrarModalCarrito() {
    const modal = document.getElementById('carritoModal');
    const carritoItemsList = document.getElementById('carrito-items');

    carritoItemsList.innerHTML = '';  // Limpiar la lista de artículos en el modal

    if (atributos.length > 0) {
        // Iterar sobre los atributos
        atributos.forEach(atributo => {
            const subnameTitle = document.createElement('h2');
            subnameTitle.textContent = `Selecciona El ${atributo.name} Y La Cantidad`;
            carritoItemsList.appendChild(subnameTitle);

            // Iterar sobre los items de cada atributo
            atributo.items.forEach(item => {
                if (item.checked) {
                    const li = document.createElement('li');

                    const button = document.createElement('button');
                    button.textContent = item.name;
                    button.id = item.id;
                    button.classList.add('btn-atribute');

                    // Crear contenedor de controles de cantidad (+ y -)
                    const quantityContainer = document.createElement('div');
                    quantityContainer.classList.add('quantity-controls');
                    quantityContainer.style.display = 'none';  // Inicialmente oculto

                    const minusButton = document.createElement('button');
                    minusButton.textContent = '-';
                    minusButton.classList.add('quantity-btn');

                    const quantityText = document.createElement('span');
                    quantityText.textContent = 1;  // Cantidad inicial
                    quantityText.classList.add('quantity-text');

                    const plusButton = document.createElement('button');
                    plusButton.textContent = '+';
                    plusButton.classList.add('quantity-btn');

                    // Añadir funcionalidad a los botones de cantidad
                    minusButton.addEventListener('click', function () {
                        let currentQuantity = parseInt(quantityText.textContent);
                        if (currentQuantity > 1) {
                            quantityText.textContent = currentQuantity - 1;
                            actualizarCarrito(item.id, parseInt(quantityText.textContent));
                        }
                    });

                    plusButton.addEventListener('click', function () {
                        let currentQuantity = parseInt(quantityText.textContent);
                        quantityText.textContent = currentQuantity + 1;
                        actualizarCarrito(item.id, parseInt(quantityText.textContent));
                    });

                    // Añadir los botones + y - al contenedor
                    quantityContainer.appendChild(minusButton);
                    quantityContainer.appendChild(quantityText);
                    quantityContainer.appendChild(plusButton);

                    // Función para alternar selección y mostrar/ocultar los controles de cantidad
                    button.addEventListener('click', function () {
                        button.classList.toggle('selected');
                        if (button.classList.contains('selected')) {
                            quantityContainer.style.display = 'block';  // Mostrar controles de cantidad
                            agregarAlCarrito(item.id, parseInt(quantityText.textContent));  // Agregar producto al carrito
                        } else {
                            quantityContainer.style.display = 'none';  // Ocultar controles de cantidad
                            removerDelCarrito(item.id);  // Quitar producto del carrito
                        }
                    });

                    li.appendChild(button);
                    li.appendChild(quantityContainer);  // Añadir los controles de cantidad al <li>
                    carritoItemsList.appendChild(li);
                }
            });
        });
    } else {
        const subnameTitle = document.createElement('h2');
        subnameTitle.textContent = `Selecciona el producto y su cantidad`;
        carritoItemsList.appendChild(subnameTitle);

        // Iterar sobre los items de cada atributo
        const li = document.createElement('li');

        const button = document.createElement('button');
        button.textContent = variantes.name;
        button.id = variantes.variation_id;
        button.classList.add('btn-atribute');

        // Crear contenedor de controles de cantidad (+ y -)
        const quantityContainer = document.createElement('div');
        quantityContainer.classList.add('quantity-controls');
        quantityContainer.style.display = 'none';  // Inicialmente oculto

        const minusButton = document.createElement('button');
        minusButton.textContent = '-';
        minusButton.classList.add('quantity-btn');

        const quantityText = document.createElement('span');
        quantityText.textContent = 1;  // Cantidad inicial
        quantityText.classList.add('quantity-text');

        const plusButton = document.createElement('button');
        plusButton.textContent = '+';
        plusButton.classList.add('quantity-btn');

        // Añadir funcionalidad a los botones de cantidad
        minusButton.addEventListener('click', function () {
            let currentQuantity = parseInt(quantityText.textContent);
            if (currentQuantity > 1) {
                quantityText.textContent = currentQuantity - 1;
                actualizarCarrito(variantes.variation_id, parseInt(quantityText.textContent));
            }
        });

        plusButton.addEventListener('click', function () {
            let currentQuantity = parseInt(quantityText.textContent);
            quantityText.textContent = currentQuantity + 1;
            actualizarCarrito(variantes.variation_id, parseInt(quantityText.textContent));
        });

        // Añadir los botones + y - al contenedor
        quantityContainer.appendChild(minusButton);
        quantityContainer.appendChild(quantityText);
        quantityContainer.appendChild(plusButton);

        // Función para alternar selección y mostrar/ocultar los controles de cantidad
        button.addEventListener('click', function () {
            button.classList.toggle('selected');
            if (button.classList.contains('selected')) {
                quantityContainer.style.display = 'block';  // Mostrar controles de cantidad
                agregarAlCarrito(variantes.variation_id, parseInt(quantityText.textContent));  // Agregar producto al carrito
            } else {
                quantityContainer.style.display = 'none';  // Ocultar controles de cantidad
                removerDelCarrito(variantes.variation_id);  // Quitar producto del carrito
            }
        });

        li.appendChild(button);
        li.appendChild(quantityContainer);  // Añadir los controles de cantidad al <li>
        carritoItemsList.appendChild(li);
    }

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Siguiente';
    nextButton.classList.add('submit-btn');
    nextButton.addEventListener('click', () => {
        if (carrito.length === 0) { return alert('Debe seleccionar el producto y su cantidad.') }
        mostrarFormularioCarrito();
    });

    carritoItemsList.appendChild(nextButton);
    modal.style.display = 'block';
}

function agregarAlCarrito(productId, cantidad) {
    // Verificar si el producto ya está en el carrito
    const productoExistente = carrito.find(item => item.id === productId);

    if (productoExistente) {
        // Si el producto ya está, actualizar la cantidad
        productoExistente.cantidad = cantidad;
    } else {
        // Si el producto no está, agregarlo al carrito
        carrito.push({ id: productId, cantidad: cantidad });
    }

    console.log('Carrito actualizado:', carrito);
}

function removerDelCarrito(productId) {
    carrito = carrito.filter(item => item.id !== productId);
    console.log('Carrito actualizado:', carrito);
}

function actualizarCarrito(productId, cantidad) {
    const productoExistente = carrito.find(item => item.id === productId);

    if (productoExistente) {
        productoExistente.cantidad = cantidad;
    }

    console.log('Carrito actualizado:', carrito);
}

function mostrarFormularioCarrito() {
    const carritoItemsList = document.getElementById('carrito-items');
    carritoItemsList.innerHTML = '';  // Limpiar la lista para mostrar el formulario

    const formulario = document.createElement('form');

    // Crear campos del formulario
    const campos = [
        { placeholder: 'Nombres', type: 'text', name: 'nombres' },
        { placeholder: 'Apellidos', type: 'text', name: 'apellidos' }, // Cambié 'email' por 'text'
        { placeholder: 'Correo Electrónico', type: 'email', name: 'correo' },
        { placeholder: 'Teléfono', type: 'tel', name: 'telefono' },
        {
            placeholder: 'Departamento', type: 'select', name: 'departamento', options: [
                'Amazonas', 'Antioquia', 'Arauca', 'Archipielago de san andres', 'Atlántico', 'Bolívar', 'Boyacá',
                'Caldas', 'Caqueta', 'Casanare', 'Cauca', 'Cesar', 'Choco', 'Córdoba', 'Cundinamarca', 'Guainia',
                'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo',
                'Quindío', 'Risaralda', 'Santander', 'Sucre', 'Tolima', 'Valle', 'Vaupes', 'Vichada'
            ]
        },
        { placeholder: 'Ciudad', type: 'text', name: 'ciudad' },
        { placeholder: 'Dirección', type: 'text', name: 'direccion' },
        { placeholder: 'Barrio', type: 'text', name: 'barrio' },
        { placeholder: 'Nota del Pedido', type: 'textarea', name: 'nota' }
    ];

    campos.forEach(campo => {
        let input;
        if (campo.type === 'select') {
            input = document.createElement('select');
            input.name = campo.name;
            input.required = true;
            campo.options.forEach(optionText => {
                const option = document.createElement('option');
                option.value = optionText;
                option.textContent = optionText;
                input.appendChild(option);
            });
        } else if (campo.type === 'textarea') {
            input = document.createElement('textarea');
            input.placeholder = 'Nota del Pedido, Ej : Al lado del centro comercial';
            input.style.width = '100%';
            input.required = false;
        } else {
            input = document.createElement('input');
            input.type = campo.type;
            input.placeholder = campo.placeholder;
            input.required = true; // Solo los campos requeridos
        }

        input.name = campo.name;
        input.id = campo.name;

        formulario.appendChild(input);
    });

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Confirmar Compra';
    submitButton.classList.add('submit-btn');

    submitButton.addEventListener('click', (e) => {
        e.preventDefault();

        // Validación de campos vacíos
        const formValid = [...formulario.elements].every(input => input.checkValidity());

        // Validación específica del teléfono
        const telefonoInput = formulario.querySelector('input[name="telefono"]');
        const telefonoValido = /^\d{10}$/.test(telefonoInput.value);

        if (formValid && telefonoValido) {
            crearOrden();
        } else {
            let mensaje = 'Por favor, completa todos los campos obligatorios.';
            if (!telefonoValido) {
                mensaje += '\nEl teléfono debe contener exactamente 10 números.';
            }
            alert(mensaje);
            formulario.reportValidity();  // Resaltar los campos que faltan
        }
    });

    formulario.appendChild(submitButton);
    carritoItemsList.appendChild(formulario);
    modal.style.display = 'block';
}

function msgVentaExitosa() {
    const carritoItems = document.querySelector('#carrito-items');
    carritoItems.innerHTML = '';

    const mensajeAgradecimiento = document.createElement('div');
    mensajeAgradecimiento.classList.add('mensaje-exito');

    mensajeAgradecimiento.innerHTML = `
        <h2>🎉 ¡Gracias por tu compra! 🎉</h2>
        <p>📦 Tu pedido ha sido procesado exitosamente.</p>
        <p>📧 Te enviaremos una notificación a tu correo electrónico con la información del envío.</p>
        <p>🌟 ¡Esperamos que disfrutes de tu nuevo producto! 🌟</p>
    `;
    carritoItems.appendChild(mensajeAgradecimiento);
}

function cerrarModal() {
    const modal = document.getElementById('carritoModal');
    modal.style.display = 'none';
}

document.querySelector('.close').addEventListener('click', cerrarModal);

window.addEventListener('click', function (event) {
    const modal = document.getElementById('carritoModal');
    if (event.target === modal) {
        cerrarModal();
    }
});


import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

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
let comision = 0
let plataforma = ''
let nuevaVenta = {}

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
    } else {
        console.log("No se proporcionó ID de producto.");
    }
});

// FIREBASE
async function obtenerProductoPorID(productoID) {
    document.querySelector('#spinner').style.display = 'flex';
    try {
        const docRef = doc(db, 'productos', productoID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            printHTML(docSnap.data());
            precio = docSnap.data().precio
            plataforma = docSnap.data().plataforma
            comision = docSnap.data().comision
        } else {
            console.log("No se encontró el producto.");
        }
    } catch (error) {
        console.error("Error al obtener el producto:", error);
    } finally {
        document.querySelector('#spinner').style.display = 'none';
    }
}

async function crearVenta(raw, nuevaVenta) {
    const { courrier, free_shipping, isDropshipping, listBlackCourriers, validateAddress, validateDuplicate, validateReturns, ...datos } = raw;
    datos.plataforma = plataforma
    datos.infoVenta = nuevaVenta
    try {
        const ventasRef = collection(db, 'ventas');
        await addDoc(ventasRef, datos);
        msgVentaExitosa()
    } catch (error) {
        console.error("Error al registrar la venta en Firebase:", error);
    }
}

async function registrarVentaAfiliado() {
    try {
        const idAfiliado = localStorage.getItem('afiliadoProducto');
        if (!idAfiliado || idAfiliado == 'null') {
            console.error("No se encontró el ID del afiliado");
            return;
        }

        // Obtener el ID del afiliado padre desde el documento del afiliado
        const afiliadoDoc = await getDoc(doc(db, 'afiliados', idAfiliado));
        const afiliadoData = afiliadoDoc.data();
        const afiliadoPadreID = afiliadoData?.afiliadoReferente;

        // Crear la subcolección 'ventas' dentro del documento del afiliado
        const ventasRef = collection(db, 'afiliados', idAfiliado, 'ventas');
        nuevaVenta = {
            cantidad: carrito.reduce((sum, product) => sum + product.quantity, 0),

            comisionStocky: afiliadoPadreID
                ? (comision * carrito.reduce((sum, product) => sum + product.quantity, 0)) * 0.50
                : comision * carrito.reduce((sum, product) => sum + product.quantity, 0),

            comisionAfiliado: afiliadoPadreID
                ? (comision * carrito.reduce((sum, product) => sum + product.quantity, 0)) * 0.45
                : comision * carrito.reduce((sum, product) => sum + product.quantity, 0),

            comisionAfiliadoPadre: afiliadoPadreID
                ? (comision * carrito.reduce((sum, product) => sum + product.quantity, 0)) * 0.05
                : 0,

            fecha: new Date(),
            urlProducto: window.location.href,
            valorVenta: carrito.reduce((sum, product) => sum + (product.quantity * precio), 0),
            afiliadoReferente: afiliadoPadreID ?? '',
        };


        await addDoc(ventasRef, nuevaVenta);
        // Actualizar las estadísticas de ventas generadas y comisión acumulada
        await actualizarVentasRealizadasEnFirebase(nuevaVenta.cantidad, nuevaVenta.comisionAfiliado, nuevaVenta.comisionAfiliadoPadre);
        console.assert("Venta Afiliado registrada en Firebase exitosamente");

        return nuevaVenta;

    } catch (error) {
        console.error("Error al registrar la venta en Firebase:", error);
    }
}

async function actualizarVentasRealizadasEnFirebase(cantidadVenta, comisionVenta, comisionAfiliadoPadre) {
    try {
        const idAfiliado = localStorage.getItem('afiliadoProducto');
        if (!idAfiliado || idAfiliado === 'null') {
            console.error("No se encontró el ID del afiliado");
            return;
        }

        // Referencia al documento del afiliado
        const afiliadoRef = doc(db, 'afiliados', idAfiliado);
        const afiliadoDoc = await getDoc(afiliadoRef);

        if (afiliadoDoc.exists()) {
            const data = afiliadoDoc.data();
            const afiliadoPadre = data.afiliadoReferente;
            const ventasGeneradasActuales = data.ventasGeneradas || 0;
            const comisionAcumuladaActual = data.comisionAcumulada || 0;

            // Actualizar los valores de ventas generadas y comisión acumulada
            await updateDoc(afiliadoRef, {
                ventasGeneradas: ventasGeneradasActuales + cantidadVenta,
                comisionAcumulada: comisionAcumuladaActual + comisionVenta,
            });

            // Verificar que existe un afiliado padre
            if (afiliadoPadre) {
                // Consulta info afiliado padre
                const afiliadoPadreRef = doc(db, 'afiliados', afiliadoPadre);
                const afiliadoPadreDoc = await getDoc(afiliadoPadreRef);
                if (afiliadoPadreDoc.exists()) {
                    const comisionSubafiliadosPadre = afiliadoPadreDoc.data().comisionSubafiliados || 0;
                    await updateDoc(afiliadoPadreRef, {
                        comisionSubafiliados: comisionSubafiliadosPadre + comisionAfiliadoPadre,
                    });

                    console.log("Comisión del afiliado padre actualizada correctamente");
                } else {
                    console.log("No se encontró el documento del afiliado padre");
                }
            } else {
                console.log("Este afiliado no tiene un afiliado padre");
            }

            console.log("Ventas generadas y comisión acumulada actualizadas correctamente");
        } else {
            console.log("No se encontró el documento del afiliado para actualizar");
        }
    } catch (error) {
        console.error("Error al actualizar las estadísticas del afiliado en Firebase:", error);
    }
}


// HTML
function printHTML(producto) {
    actualizarDetallesProducto(producto);
    actualizarOpcionesColor(producto);
    actualizarBotonesCompra(producto);
    actualizarDescripcionYGarantia(producto);
    generarPreguntasFrecuentes(producto.preguntasFrecuentes);
    configurarCompraContraEntrega();
}

function actualizarDetallesProducto(producto) {
    document.querySelector('header h1').textContent = producto.nombre;
    document.querySelector('#bannerurl').src = producto.banner;
    document.querySelector('#price').textContent = `$${producto.precio}`;
    document.querySelector('#textoSelecciona').textContent = producto.textoSelecciona;
}

function actualizarOpcionesColor(producto) {
    const colorOptions = document.querySelector('#color-options');
    colorOptions.innerHTML = '';  // Limpiar opciones previas

    producto.variantes.forEach((variantes, index) => {
        const imgElement = crearImagenVariante(variantes, index);
        colorOptions.appendChild(imgElement);
    });
}

function crearImagenVariante(variantes, index) {
    const imgElement = document.createElement('img');
    imgElement.id = `product-stocky-${variantes.id}`;
    imgElement.src = variantes.img;
    imgElement.alt = `producto ${index + 1}`;
    imgElement.style.cursor = 'pointer';

    imgElement.addEventListener('click', function () {
        toggleSeleccionImagen(imgElement, variantes);
        console.log(carrito);  // Mostrar el carrito en consola para verificar
    });

    return imgElement;
}

function toggleSeleccionImagen(imgElement, variantes) {
    const isSelected = imgElement.classList.contains('selected');

    if (isSelected) {
        imgElement.classList.remove('selected');
        imgElement.style.backgroundColor = '';  // Restaurar el color de fondo original

        // Remover el producto del carrito
        carrito = carrito.filter(item => item.id !== variantes.id);
    } else {
        imgElement.classList.add('selected');
        imgElement.style.backgroundColor = '#5a00ff';  // Cambiar color de fondo

        // Añadir al carrito solo si no existe ya
        if (!carrito.find(item => item.id === variantes.id)) {
            carrito.push({
                id: variantes.id,
                img: variantes.img,
                quantity: 1  // La cantidad inicial es 1
            });
        }
    }
}

// Función para actualizar los botones de compra
function actualizarBotonesCompra(producto) {
    const orderButtons = document.querySelectorAll('.order-btn');
    orderButtons[0].textContent = producto.textoBotones[0];
    orderButtons[1].textContent = producto.textoBotones[1];
    orderButtons[2].textContent = producto.textoBotones[0];
}

// Función para actualizar la descripción y garantía
function actualizarDescripcionYGarantia(producto) {
    document.querySelector('#reel').src = producto.reel;
    document.querySelector('#tituloDescripcion').textContent = producto.tituloDescripcion;
    document.querySelector('#decripcionPrincipal').textContent = producto.decripcionPrincipal;
    document.querySelector('#tituloGarantia').textContent = producto.tituloGarantia;
    document.querySelector('#descripcionGarantia').textContent = producto.descripcionGarantia;
}

// Función para generar preguntas frecuentes dinámicamente
function generarPreguntasFrecuentes(preguntasFrecuentes) {
    const faqSection = document.querySelector('.faq-section');
    faqSection.innerHTML = '';

    preguntasFrecuentes.forEach((pregunta) => {
        const faqItem = document.createElement('div');
        faqItem.classList.add('faq-item');

        const faqTitle = document.createElement('h3');
        faqTitle.classList.add('faq-item__title');
        faqTitle.textContent = pregunta.titulo;

        const faqDescription = document.createElement('p');
        faqDescription.textContent = pregunta.descripcion;
        faqDescription.style.display = 'none';

        faqItem.appendChild(faqTitle);
        faqItem.appendChild(faqDescription);
        faqSection.appendChild(faqItem);
    });

    acordeon();  // Llamar a la función acordeón después de generar el contenido FAQ
}

// Función para manejar el proceso de compra contra entrega
function configurarCompraContraEntrega() {
    const comprarBtn = document.getElementById('comprarcontraentrega');

    comprarBtn.addEventListener('click', function () {
        if (carrito.length > 0) {
            mostrarModalCarrito();
        } else {
            alert('Selecciona los productos que quieres.');
        }
    });
}

function mostrarModalCarrito() {
    const modal = document.getElementById('carritoModal');
    const carritoItemsList = document.getElementById('carrito-items');

    carritoItemsList.innerHTML = '';  // Limpiar la lista de artículos en el modal
    carrito.forEach((item, index) => {
        const li = document.createElement('li');

        // Crear la estructura del producto con imagen y controles de cantidad
        const imgElement = document.createElement('img');
        imgElement.src = item.img;
        imgElement.style.width = '100px';

        const quantityContainer = document.createElement('div');
        quantityContainer.classList.add('quantity-container');  // Añadir clase CSS al contenedor

        const minusButton = document.createElement('button');
        minusButton.textContent = '-';
        minusButton.classList.add('quantity-btn');  // Añadir clase CSS al botón
        minusButton.addEventListener('click', function () {
            actualizarCantidadProducto(index, -1);
        });

        const quantityText = document.createElement('span');
        quantityText.textContent = item.quantity;

        const plusButton = document.createElement('button');
        plusButton.textContent = '+';
        plusButton.classList.add('quantity-btn');  // Añadir clase CSS al botón
        plusButton.addEventListener('click', function () {
            actualizarCantidadProducto(index, 1);
        });

        quantityContainer.appendChild(minusButton);
        quantityContainer.appendChild(quantityText);
        quantityContainer.appendChild(plusButton);

        li.appendChild(imgElement);
        li.appendChild(quantityContainer);
        carritoItemsList.appendChild(li);
    });

    // Crear botón "Siguiente"
    const siguienteButton = document.createElement('button');
    siguienteButton.textContent = 'Siguiente';
    siguienteButton.classList.add('siguiente-btn');
    siguienteButton.addEventListener('click', function () {
        mostrarFormularioCarrito();  // Mostrar formulario al hacer clic en "Siguiente"
    });

    carritoItemsList.appendChild(siguienteButton);  // Agregar el botón al modal
    modal.style.display = 'block';
}

function mostrarFormularioCarrito() {
    const carritoItemsList = document.getElementById('carrito-items');
    carritoItemsList.innerHTML = '';  // Limpiar la lista para mostrar el formulario

    const formulario = document.createElement('form');

    // Crear campos del formulario
    const campos = [
        { placeholder: 'Nombres', type: 'text', name: 'nombres' },
        { placeholder: 'Apellidos', type: 'text', name: 'apellidos' },
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
            input.style.width = '100%';  // Asegurar que el textarea ocupe todo el ancho
        } else {
            input = document.createElement('input');
            input.type = campo.type;
            input.placeholder = campo.placeholder;
        }

        input.name = campo.name;
        input.id = campo.name;
        input.required = true;

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

        if (formValid) {
            crearOrden();
        } else {
            alert('Por favor, completa todos los campos obligatorios.');
            formulario.reportValidity();  // Resaltar los campos que faltan
        }
    });

    formulario.appendChild(submitButton);
    carritoItemsList.appendChild(formulario);
}

// Función para actualizar la cantidad de un producto
function actualizarCantidadProducto(index, cantidad) {
    carrito[index].quantity += cantidad;

    // No permitir que la cantidad sea menor a 1
    if (carrito[index].quantity < 1) {
        carrito[index].quantity = 1;
    }

    console.log(carrito);

    // Actualizar la vista del modal
    mostrarModalCarrito();
}

async function crearOrden() {
    const myHeaders = new Headers();
    myHeaders.append("x-api-key", "OhnnILQdYFQjaePagghzG7EKnIcSt7qjgYD3Qa0bbG0=");
    myHeaders.append("x-secret", "b7e49cfa3db4dfe8ebae7cd052996011713f186e5fa51bb706c574bf08aa922a3b20015ffb594c68281b72df3e3d9f7f25651283042e72da2cdcead1eb84b185.f71dddc43729ad31");
    myHeaders.append("Content-Type", "application/json");

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
        courrier: "Interrapidisimo",
        listBlackCourriers: [
            "Tcc", "Servientrega", "Domina", "Envia"
        ],
        free_shipping: true,
        isDropshipping: true,
        validateAddress: false,
        validateReturns: false,
        validateDuplicate: false,
        destinationBilling: {
            address: direccion,
            city: ciudad,
            department: departamento,
            neighborhood: barrio,
            phone: telefono
        },
        products: carrito.map(product => ({
            identifier: product.id,
            quantity: product.quantity,
            price: precio
        })),
        note: notas
    };

    document.querySelector('#carrito-items').innerHTML = ''
    document.querySelector('#carrito-items').textContent = 'Creando tu pedido...'

    // Enviar la solicitud POST
    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify(raw),
        redirect: "follow"
    };

    if (plataforma === 'rocketfy') {
        return fetch("https://ms-public-api.rocketfy.com/rocketfy/api/v1/orders", requestOptions)
            .then(response => {
                if (!response.ok) {
                    alert('Por favor, verifique que sus datos, tanto Departamento como Ciudad, coincidan y estén correctamente escritos.')
                    throw new Error('Network response was not ok.');
                }
            })
            .then(result => {
                registrarVentaAfiliado()
                msgVentaExitosa()
            })
            .catch(error => {
                console.error('Error:', error);
            })
    } else {
        const ventaRealziada = await registrarVentaAfiliado()
        crearVenta(raw, ventaRealziada)
    }

}

function msgVentaExitosa() {
    document.querySelector('#carrito-items').innerHTML = ''
    document.querySelector('#carrito-items').textContent = 'Gracias por tu compra!'
    setTimeout(() => {
        window.location.reload('/')
    }, 5000);
}

// Función para cerrar el modal
function cerrarModal() {
    const modal = document.getElementById('carritoModal');
    modal.style.display = 'none';
}

// Configurar el cierre del modal
document.querySelector('.close').addEventListener('click', cerrarModal);

// Cerrar el modal si se hace clic fuera del contenido del modal
window.addEventListener('click', function (event) {
    const modal = document.getElementById('carritoModal');
    if (event.target === modal) {
        cerrarModal();
    }
});

function acordeon() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const faqTitle = item.querySelector('.faq-item__title');
        const faqDescription = item.querySelector('p');

        faqTitle.addEventListener('click', () => {
            faqDescription.style.display = faqDescription.style.display === 'none' ? 'block' : 'none'; // Mostrar u ocultar la descripción
            item.classList.toggle('active'); // Clase opcional para aplicar estilos si es necesario
        });
    });
}

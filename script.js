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
let atributos = []
const modal = document.querySelector('.modal');


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
        const response = await fetch(`https://ms-public-api.rocketfy.com/rocketfy/api/v1/products?id=${productoID}`, {
            headers: {
                'x-api-key': 'OhnnILQdYFQjaePagghzG7EKnIcSt7qjgYD3Qa0bbG0=',
                'x-secret': 'b7e49cfa3db4dfe8ebae7cd052996011713f186e5fa51bb706c574bf08aa922a3b20015ffb594c68281b72df3e3d9f7f25651283042e72da2cdcead1eb84b185.f71dddc43729ad31'
            }
        });

        const producto = await response.json();
        if (producto) {
            printHTML(producto[0]);
            atributos = producto[0].attributes
            precio = producto[0].price
        } else {
            console.log("Producto no encontrado.");
        }
    } catch (error) {
        console.error("Error al obtener el producto:", error);
    } finally {
        document.querySelector('#spinner').style.display = 'none';
    }
}

// async function crearVenta(raw, nuevaVenta) {
//     const { courrier, free_shipping, isDropshipping, listBlackCourriers, validateAddress, validateDuplicate, validateReturns, ...datos } = raw;
//     datos.plataforma = plataforma
//     datos.infoVenta = nuevaVenta
//     try {
//         const ventasRef = collection(db, 'ventas');
//         await addDoc(ventasRef, datos);
//         msgVentaExitosa()
//     } catch (error) {
//         console.error("Error al registrar la venta en Firebase:", error);
//     }
// }

// FIREBASE

async function registrarVentaAfiliado(venta) {
    try {
        const idAfiliado = localStorage.getItem('afiliadoProducto');
        if (!idAfiliado || idAfiliado == 'null') {
            console.error("No se encontró el ID del afiliado");
            return;
        }

        console.log(venta);


        // Obtener el ID del afiliado padre desde el documento del afiliado
        const afiliadoDoc = await getDoc(doc(db, 'afiliados', idAfiliado));
        const afiliadoData = afiliadoDoc.data();
        const afiliadoPadreID = afiliadoData?.afiliadoReferente;

        // Crear la subcolección 'ventas' dentro del documento del afiliado
        const ventasRef = collection(db, 'afiliados', idAfiliado, 'ventas');


        await addDoc(ventasRef, venta);
        // Actualizar las estadísticas de ventas generadas y comisión acumulada
        //  await actualizarVentasRealizadasEnFirebase(nuevaVenta.cantidad, nuevaVenta.comisionAfiliado, nuevaVenta.comisionAfiliadoPadre);
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
            identifier: String(product.id),
            quantity: product.cantidad,
            price: precio
        })),
        note: notas
    };

    document.querySelector('#carrito-items').innerHTML = ''
    document.querySelector('#carrito-items').textContent = 'Creando tu pedido...'

    let venta = {
        "_id": "66e4d05274d0ed0c4ce7ce40",
        "order_id": 332,
        "billing": {
            "full_name": "Gottfried",
            "last_name": "Leibniz",
            "email": "test@beispiel.de",
            "phone": "030303986300",
            "address": "Erfundene Straße 33",
            "composed_address": {},
            "country": "CO",
            "cc": null,
            "departament": "Tolima",
            "city": {
                "_id": "6047cb9b2a977165ccde90b0",
                "name": "Ibague",
                "state": {
                    "id": "6047cb912a977165ccde8ce7",
                    "name": "Tolima",
                    "code": "73"
                },
                "country": {
                    "id": "6047cb912a977165ccde8cd1",
                    "name": "Colombia",
                    "code": "COL"
                },
                "disabled": false,
                "shop_error": false,
                "forTest": true,
                "city_code": "73001000"
            },
            "neighborhood": "valpa",
            "geolocation": null
        },
        "total": 59000,
        "rkfpayment": {
            "rates": {
                "rkf_charge": 0.0299,
                "retefte": 0.015,
                "reteica": 0.002,
                "iva": 0.19,
                "reteiva": 0.15,
                "iva_rkf": 0.19
            },
            "exclude": {
                "iva": true
            },
            "purchase_value": 59000,
            "constant_fee": 900,
            "total_before": 0,
            "rkf_charge": 1764.1,
            "retefte": 0,
            "reteica": 0,
            "iva": 0,
            "reteiva": 0,
            "iva_rkf": 506.179
        }
    }


    registrarVentaAfiliado(venta)


    // Enviar la solicitud POST
    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify(raw),
        redirect: "follow"
    };

    return

    return fetch("https://ms-public-api.rocketfy.com/rocketfy/api/v1/orders", requestOptions)
        .then(response => {
            if (!response.ok) {
                alert('Por favor, verifique que sus datos, tanto Departamento como Ciudad, coincidan y estén correctamente escritos.');
                throw new Error('Network response was not ok.');
            }

            return response.json();
        })
        .then(result => {
            registrarVentaAfiliado(result)
            msgVentaExitosa();
        })
        .catch(error => {
            console.error('Error:', error);
        });



}


function printHTML(producto) {
    console.log(producto);
    document.querySelector('#content').innerHTML = `
    <header class="hero-section">
        <h1>${producto.name}</h1>
        <img src="${producto.imagePrin.location}" alt="banner" width="350" id="bannerurl">
        <p class="price" id="price"> ${producto.price} </p>
        <button class="order-btn">Comprar Ahora</button>
        <ul class="features">
            <li>Envío gratis a toda Colombia</li>
            <li>Pago contraentrega</li>
        </ul>
    </header>

    <section class="colors-section">
        <h2 id="textoSelecciona"></h2>
        <div class="color-options" id="color-options"></div>
        <button class="order-btn">Lo quiero!</button>
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
    <h2>Descripcion Genreal</h2>
        ${producto.description} 
        <button class="order-btn">Obtén el Tuyo</button>
    </section>

    <section class="warranty-section">
        <h2 id="tituloGarantia">Nustra Garantía</h2>
        <p id="descripcionGarantia">Contamos con ${producto.warranty} mes de Garantía</p>
    </section>

    `
    actualizarOpcionesColor(producto);
    configurarCompraContraEntrega();

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
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Siguiente';
    nextButton.classList.add('submit-btn');
    nextButton.addEventListener('click', mostrarFormularioCarrito);

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
    modal.style.display = 'block';
}

function msgVentaExitosa() {
    document.querySelector('#carrito-items').innerHTML = ''
    document.querySelector('#carrito-items').textContent = 'Gracias por tu compra!'
    // setTimeout(() => {
    //     window.location.reload('/')
    // }, 5000);
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


const institutionalLinks = [
    ['Régimen Legal', 'https://legal.unal.edu.co'],
    ['Talento humano', 'https://personal.unal.edu.co'],
    ['Contratación', 'https://portaladquisiciones.unal.edu.co/'],
    ['Ofertas de empleo', 'https://personal.unal.edu.co'],
    ['Rendición de cuentas', 'https://launalcuenta.unal.edu.co/'],
    ['Concurso docente', 'https://docentes.unal.edu.co/concurso-profesoral/'],
    ['Pago Virtual', 'https://pagovirtual.unal.edu.co/'],
    ['Control interno', 'https://controlinterno.unal.edu.co/'],
    ['Calidad', 'http://siga.unal.edu.co'],
    ['Buzón de notificaciones', 'https://unal.edu.co/buzon-de-notificaciones/'],
];

const serviceLinks = [
    ['Correo institucional', 'https://smartkey.xertica.com/cloudkey/a/unal.edu.co/user/login'],
    ['Redes Sociales', 'https://redessociales.unal.edu.co'],
    ['Quejas y reclamos', 'https://quejasyreclamos.unal.edu.co/'],
    ['Atención en línea', 'https://unal.edu.co/atencion-en-linea/'],
    ['Encuesta', 'https://unal.edu.co/encuesta/'],
    ['Contáctenos', 'https://unal.edu.co/contactenos'],
    ['Estadísticas', 'https://estadisticas.unal.edu.co/'],
];

function LinkColumn({ links }: { links: string[][] }) {
    return <nav className="grid grid-cols-2 gap-x-5 gap-y-1 text-sm">{links.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer" className="text-white/90 hover:text-[#d7e6a5] hover:underline">{label}</a>)}</nav>;
}

export default function InstitutionalFooter() {
    return <footer className="font-['Ancizar_Sans'] bg-[#666] px-5 py-8 text-[#ddd] lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1.25fr_180px]">
            <LinkColumn links={institutionalLinks} />
            <LinkColumn links={serviceLinks} />
            <div className="border-l border-white/20 pl-5 text-sm leading-6">
                <p><strong>Contacto página web:</strong><br />Carrera 45 # 26-85 Of. 000<br />Edif. Uriel Gutiérrez, Bogotá D.C., Colombia<br />PBX: (+57) 601 4068888 - (+57) 601 3165000<br />Línea Gratuita Nacional: 01 8000 912 597</p>
                <p className="mt-4 border-t border-white/20 pt-3"><a href="https://unal.edu.co/archivos/user_upload/docs/legal.pdf" target="_blank" rel="noreferrer" className="hover:underline">© Copyright 2019</a><br />Algunos derechos reservados.<br /><a href="mailto:correo@unal.edu.co" className="hover:underline">correo@unal.edu.co</a></p>
            </div>
            <div className="grid grid-cols-2 items-start gap-4 lg:grid-cols-1">
                <a href="https://orgullo.unal.edu.co" target="_blank" rel="noreferrer"><img src="/unal/images/log_orgullo.png" alt="Orgullo UN" className="mx-auto max-h-9 w-auto" /></a>
                <a href="https://agenciadenoticias.unal.edu.co" target="_blank" rel="noreferrer"><img src="/unal/images/log_agenc.png" alt="Agencia de Noticias" className="mx-auto max-h-9 w-auto" /></a>
                <a href="https://www.gov.co/" target="_blank" rel="noreferrer"><img src="/unal/images/log_gobiern.png" alt="Portal Único del Estado Colombiano" className="mx-auto max-h-12 w-auto" /></a>
                <a href="http://www.contaduria.gov.co/" target="_blank" rel="noreferrer"><img src="/unal/images/log_contra.png" alt="Contaduría General de la República" className="mx-auto max-h-12 w-auto" /></a>
            </div>
        </div>
    </footer>;
}
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
    ['Mapa del sitio', '#'],
    ['Redes Sociales', 'https://redessociales.unal.edu.co'],
    ['FAQ', '#'],
    ['Quejas y reclamos', 'https://quejasyreclamos.unal.edu.co/'],
    ['Atención en línea', 'https://unal.edu.co/atencion-en-linea/'],
    ['Encuesta', 'https://unal.edu.co/encuesta/'],
    ['Contáctenos', 'https://unal.edu.co/contactenos'],
    ['Estadísticas', 'https://estadisticas.unal.edu.co/'],
    ['Glosario', '#'],
];

function LinkColumn({ links }: { links: string[][] }) {
    return <nav className="flex flex-col gap-[1px] text-[13px] leading-[1.3]">{links.map(([label, href]) => {
        const isExternal = href.startsWith('http') || href.startsWith('mailto:');

        return <a key={label} href={href} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noreferrer' : undefined} className="text-white no-underline hover:text-[#eee] hover:underline">{label}</a>;
    })}</nav>;
}

export default function InstitutionalFooter() {
    return <footer className="clear-both bg-[#666] px-[15px] py-[15px] font-['Ancizar_Sans'] text-[13px] leading-[1.1] text-[#ddd] sm:px-[15px] sm:pb-[25px]">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-[3fr_3fr_4fr_2fr] lg:gap-0">
            <LinkColumn links={institutionalLinks} />
            <LinkColumn links={serviceLinks} />
            <div className="col-span-2 border-t border-[#555] pt-5 text-[13px] lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <div className="grid grid-cols-2 items-start gap-4">
                    <p className="m-0"><strong>Contacto página web:</strong><br />cra 27 # 64-60<br />Bloque D piso 4<br />Manizales, Colombia<br />(+57 1) 8879307 Ext.50442</p>
                    <p className="m-0 text-right border-r border-[#555] pr-4 lg:pr-5"><a href="https://unal.edu.co/archivos/user_upload/docs/legal.pdf" target="_blank" rel="noreferrer" className="text-white hover:underline">© Copyright 2016</a><br />Algunos derechos reservados.<br /><a href="mailto:diracam_man@unal.edu.co" className="text-white hover:underline">diracman_man@unal.edu.co</a><br /><a href="#" className="text-white hover:underline">Acerca de este sitio web</a><br />Actualización: 01/02/17</p>
                </div>
            </div>
            <div className="col-span-2 grid grid-cols-4 items-start gap-3 border-t border-[#555] pt-5 lg:col-span-1 lg:grid-cols-2 lg:gap-5 lg:border-t-0 lg:pl-5 lg:pt-0">
                <a href="https://orgullo.unal.edu.co" target="_blank" rel="noreferrer"><img src="/unal/images/log_orgullo.png" alt="Orgullo UN" width="78" height="21" className="mx-auto block max-h-[37px] w-auto" /></a>
                <a href="https://agenciadenoticias.unal.edu.co" target="_blank" rel="noreferrer"><img src="/unal/images/log_agenc.png" alt="Agencia de Noticias" width="94" height="25" className="mx-auto block max-h-[37px] w-auto" /></a>
                <a href="https://www.gov.co/" target="_blank" rel="noreferrer"><img src="/unal/images/log_gobiern.png" alt="Portal Único del Estado Colombiano" width="67" height="51" className="mx-auto block max-h-[51px] w-auto" /></a>
                <a href="http://www.contaduria.gov.co/" target="_blank" rel="noreferrer"><img src="/unal/images/log_contra.png" alt="Contaduría General de la República" width="67" height="51" className="mx-auto block max-h-[51px] w-auto" /></a>
            </div>
        </div>
    </footer>;
}
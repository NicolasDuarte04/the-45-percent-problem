/**
 * Metodología (Session 14) — the page that backs the transparency claim.
 *
 * Plain Spanish on the surface; the technical depth lives behind native
 * <details> "Ver la matemática" toggles. Every model fact here is read from the
 * real code (model/aggregate_polls.py, model/eligibility.py,
 * model/simulate_runoff.py, config.yaml, data/calibration/co_house_effects.json)
 * and from the live snapshot via getVotoData(); nothing is aspirational. If a
 * claim here is not something the model actually does, that is a bug.
 *
 * Server component: reads the snapshot directly so the pollster list, poll
 * count, half-life and preliminary state are the real ones, not placeholders.
 * No em or en dashes anywhere rendered; no affirmative betting words; the
 * candidates are named, never described.
 */

import type { Metadata } from "next";
import { TopBar } from "../_components/TopBar";
import { SectionHeader } from "../_components/SectionHeader";
import { VotoFooter } from "../_components/VotoFooter";
import { getVotoData } from "../_lib/snapshot-source";
import { daysUntil } from "../_lib/voto-runtime";

export const metadata: Metadata = {
  title: "Metodología · El Voto del 21 de Junio",
  description:
    "Cómo se construye la probabilidad de la segunda vuelta: agregación bayesiana de las encuestas, recencia, corrección por casa encuestadora, filtro de inclusión y Monte Carlo. El código es público.",
};

const REPO_URL = "https://github.com/NicolasDuarte04/el-voto-del-21-de-junio";

/** A "Ver la matemática" disclosure: plain text first, technical depth inside. */
function VerMatematica({ children }: { children: React.ReactNode }) {
  return (
    <details className="metodo-math">
      <summary>Ver la matemática</summary>
      <div className="metodo-math-body">{children}</div>
    </details>
  );
}

export default function MetodologiaPage() {
  const { model, pulso } = getVotoData();
  const days = daysUntil();

  const real = !model.isFallback;
  const halflife = model.recencyHalflifeDays || 5;
  const included = model.pollstersIncluded;
  const considered = model.nPollsConsidered || model.nPolls;
  const excluded = model.nPollsExcluded;
  const preliminar = model.sufficiency !== "ok";

  return (
    <>
      <TopBar variant="inner" />
      <main className="wrap metodo">
        {/* Qué es esto */}
        <section className="section" style={{ paddingTop: 18 }}>
          <SectionHeader
            n=""
            label="Método y supuestos"
            title="Metodología"
            sub="Cómo se construye el número, con qué datos, y dónde están sus límites. En español llano arriba; la matemática, detrás de cada “Ver la matemática”."
          />

          <div className="card card-pad" style={{ marginTop: 18 }}>
            <h3 className="metodo-h">Qué es esta cifra</h3>
            <p>
              Es una <strong>probabilidad</strong> del resultado de la segunda vuelta, con su
              incertidumbre. No es una predicción y no es un consejo. Le decimos qué tan apretada
              está la cosa según las encuestas públicas, no por quién votar.
            </p>
            {real ? (
              <p className="metodo-live">
                Hoy el modelo da{" "}
                <strong>
                  {model.pCepeda.toFixed(0)}% Cepeda · {model.pEspriella.toFixed(0)}% De la Espriella
                </strong>
                , con un margen 80% de {model.marginLoPp.toFixed(0)} a {model.marginHiPp.toFixed(0)}{" "}
                puntos. {preliminar ? "Cifra preliminar: muy parejo." : "Cifra estable."} Corte del{" "}
                {model.snapshotDate}, encuesta más reciente del {model.newestPollDate}.
              </p>
            ) : (
              <p className="metodo-live">
                En esta vista las cifras son datos de ejemplo. En producción la página lee el
                snapshot real del modelo.
              </p>
            )}
          </div>
        </section>

        {/* Cómo se construye el número */}
        <section className="section">
          <SectionHeader n="" label="El cálculo, paso a paso" title="Cómo se construye el número" />

          {/* 1 · agregación */}
          <div className="card card-pad metodo-step">
            <span className="metodo-num">1</span>
            <h3 className="metodo-h">Se juntan las encuestas, no todas pesan igual</h3>
            <p>
              Cada encuesta de segunda vuelta aporta su cifra de Cepeda frente a De la Espriella. Una
              encuesta con más entrevistados y más reciente pesa más; una con menos respaldo pesa
              menos. El resultado es un promedio ponderado por precisión, no un promedio simple.
            </p>
            <VerMatematica>
              <p>
                Cada encuesta se reduce a la cuota de dos vías de Cepeda,{" "}
                <code>cepeda / (cepeda + espriella)</code>; se descartan otros y los indecisos antes
                de normalizar. La combinación es una actualización normal de forma cerrada ponderada
                por precisión (varianza inversa), sin MCMC.
              </p>
              <p>
                La precisión de cada encuesta es{" "}
                <code>recencia / (varianza interna + tau²)</code>. La varianza interna lleva el error
                de muestreo, el residuo de la corrección por casa encuestadora y, en las firmas de
                baja confianza, una inflación. <code>tau²</code> es la varianza entre encuestas
                (DerSimonian y Laird): como las encuestadoras de 2026 discrepan más allá del error de
                muestreo, este término ensancha el intervalo para que sea honesto en vez de
                falsamente estrecho.
              </p>
            </VerMatematica>
          </div>

          {/* 2 · recencia */}
          <div className="card card-pad metodo-step">
            <span className="metodo-num">2</span>
            <h3 className="metodo-h">Lo reciente manda</h3>
            <p>
              El peso de una encuesta cae a la mitad cada {halflife} días. Una encuesta de hace una
              semana pesa mucho menos que la de ayer. Esto mantiene el número pegado a lo último que
              dicen las urnas de opinión.
            </p>
            <VerMatematica>
              <p>
                El peso de recencia es <code>0.5 ^ (días_antes / H)</code>, con una vida media{" "}
                <code>H = {halflife}</code> días leída de la calibración, no reajustada aquí. Es una
                solución de frontera: {halflife} días es el borde inferior de la malla calibrada
                (5 a 45 días). Con las encuestas a más de dos semanas de la votación, la más reciente
                se lleva casi todo el peso. Lo decimos abierto en los límites de abajo.
              </p>
            </VerMatematica>
          </div>

          {/* 3 · house effects */}
          <div className="card card-pad metodo-step">
            <span className="metodo-num">3</span>
            <h3 className="metodo-h">Se corrige el sesgo de cada encuestadora, con mano suave</h3>
            <p>
              Algunas firmas tienden a inclinarse hacia un bloque. Medimos esa tendencia con las
              elecciones de 2018 y 2022 y la corregimos solo a medias: movemos la cifra la mitad del
              sesgo estimado y dejamos el resto como incertidumbre. Nunca restamos el sesgo como si lo
              conociéramos con certeza.
            </p>
            <VerMatematica>
              <p>
                Corrección como prior suave: el centro se mueve{" "}
                <code>house_effect_shrink = 0.5</code> del sesgo de bloque estimado de la firma; el
                remanente no aplicado se carga como varianza. Las firmas de baja confianza (un solo
                ciclo de evidencia) ven su varianza multiplicada por 3.
              </p>
              <p>
                El sesgo de cada casa encuestadora se calibra exigiendo al menos dos ciclos
                electorales (2018 y 2022) para considerarla de alta confianza; con un solo ciclo, la
                firma es de baja confianza. Los sesgos viven en{" "}
                <code>data/calibration/co_house_effects.json</code>, que es público.
              </p>
            </VerMatematica>
          </div>

          {/* 4 · inclusion gate */}
          <div className="card card-pad metodo-step">
            <span className="metodo-num">4</span>
            <h3 className="metodo-h">Solo entran las encuestadoras con historial medible</h3>
            <p>
              Una firma alimenta el número solo si tiene historial en 2018 o 2022, porque sin ese
              historial no podemos medir ni corregir su sesgo. La regla es neutral: depende del
              historial, nunca de a qué candidato favorece la encuesta. Lo que queda por fuera no se
              borra, se registra como excluido y con su razón.
            </p>
            {real ? (
              <p className="metodo-live">
                En este corte alimentan el número {included.length > 0 ? included.join(", ") : "las firmas calibradas"}.{" "}
                {excluded > 0
                  ? `${model.nPolls} de ${considered} encuestas consideradas entraron; ${excluded} quedaron excluidas por no tener ciclo calibrado.`
                  : `${model.nPolls} de ${considered} encuestas consideradas entraron; ninguna quedó excluida en este corte.`}
              </p>
            ) : null}
            <VerMatematica>
              <p>
                Una encuestadora es elegible si y solo si aparece en el corpus de sesgos{" "}
                <code>co_house_effects.json</code>, es decir, si tiene al menos un ciclo calibrado y
                por tanto un sesgo estimable. El filtro corre en la frontera del agregador, no en la
                ingesta: se sigue registrando cada encuesta real encontrada, pero solo las firmas
                corregibles mueven el número. El caso que motivó la regla fue una encuesta real de
                2026 sin ciclo 2018/2022: no es corregible, así que queda fuera, aunque sacarla mueva
                la cifra.
              </p>
            </VerMatematica>
          </div>

          {/* 5 · monte carlo */}
          <div className="card card-pad metodo-step">
            <span className="metodo-num">5</span>
            <h3 className="metodo-h">La probabilidad y su intervalo salen de simular</h3>
            <p>
              Con el promedio ponderado y su incertidumbre, simulamos diez mil escenarios y contamos
              en cuántos queda por delante cada quien. Esa cuenta es la probabilidad. El intervalo
              del 80% dice entre qué márgenes cae el resultado en la mayoría de los escenarios.
            </p>
            <VerMatematica>
              <p>
                Monte Carlo de <code>10.000</code> corridas con semilla fija{" "}
                <code>20260621</code>, así que es reproducible. Cada corrida toma una muestra de la
                cuota de Cepeda del posterior, ensanchada en cuadratura por una incertidumbre de
                participación e indecisos. <code>p_cepeda</code> es la fracción de corridas en que la
                cuota de Cepeda supera 0.5; el intervalo del 80% son los percentiles 10 y 90 del
                margen. El margen va en puntos porcentuales, positivo a favor de De la Espriella.
              </p>
            </VerMatematica>
          </div>
        </section>

        {/* Los datos */}
        <section className="section">
          <SectionHeader n="" label="La materia prima" title="Los datos" />
          <div className="card card-pad">
            <ul className="metodo-list">
              <li>
                <strong>Las encuestadoras.</strong>{" "}
                {real && included.length > 0
                  ? `En este corte: ${included.join(", ")}.`
                  : "Solo firmas con trayectoria calibrada en 2018 o 2022."}{" "}
                Cada una pesa por su tamaño de muestra, su antigüedad y la confianza de su corrección.
              </li>
              <li>
                <strong>El corpus de calibración.</strong> Los sesgos de casa encuestadora se estiman
                con las elecciones de 2018 y 2022. Ese corpus, con sus sesgos por firma, está en el
                repositorio público.
              </li>
              <li>
                <strong>Qué tan frescas.</strong>{" "}
                {real
                  ? `${model.nPolls} encuestas alimentan el corte del ${model.snapshotDate}; la más reciente es del ${model.newestPollDate}.`
                  : "En producción la página muestra el conteo y las fechas reales del último snapshot."}{" "}
                Faltan {days} días para la votación.
              </li>
            </ul>
          </div>
        </section>

        {/* Los límites */}
        <section className="section">
          <SectionHeader
            n=""
            label="Lo que todavía no sabe"
            title="Los límites, dichos de frente"
          />
          <div className="card card-pad">
            <ul className="metodo-list metodo-limits">
              <li>
                <strong>Está muy parejo, y es preliminar.</strong> El ganador cambia de un lado a otro
                según supuestos defendibles (con o sin corrección de sesgo, vida media de 5 o 10 días).
                Cuando eso pasa, el modelo se marca a sí mismo como preliminar. No hay un resultado
                firme que anunciar todavía.
              </li>
              <li>
                <strong>La vida media de {halflife} días es una solución de frontera.</strong> Es el
                borde inferior de la malla calibrada. El número se apoya mucho en la encuesta más
                reciente, lo cual lo hace sensible a un solo dato nuevo.
              </li>
              <li>
                <strong>El Mapa es por departamento, no por municipio.</strong> No hay datos
                municipales limpios y certificados en la fuente abierta, así que el Mapa reparte por
                departamento. Es indicativo, no la cuenta exacta de su municipio.
              </li>
              <li>
                <strong>El Pulso Patrio es 1 de 5 señales.</strong> El índice está pensado para
                componer cinco señales; hoy solo una (titulares de prensa) está en vivo, y con unos
                días de rezago. Mide cuánto se habla, no quién va adelante, y no alimenta la
                probabilidad.
              </li>
              <li>
                <strong>La ley de silencio congela las encuestas.</strong> En la semana previa a la
                votación no se pueden publicar encuestas nuevas, así que el número se queda con los
                últimos datos permitidos hasta el cierre.
              </li>
            </ul>
          </div>
        </section>

        {/* Código público */}
        <section className="section">
          <SectionHeader n="" label="Verifíquelo usted" title="Código público" />
          <div className="card card-pad metodo-repo">
            <p>
              No le pedimos que nos crea. El modelo completo es público: cualquiera puede leer la
              agregación, la vida media de la recencia, la corrección por casa encuestadora y el
              filtro de inclusión, y correr el mismo número.
            </p>
            <p className="mono metodo-repo-paths">
              model/aggregate_polls.py · model/eligibility.py · model/simulate_runoff.py · config.yaml
              · data/calibration/co_house_effects.json
            </p>
            <a className="btn btn-accent" href={REPO_URL} target="_blank" rel="noopener noreferrer">
              Ver el código en GitHub <span className="arr">→</span>
            </a>
          </div>
        </section>

        {/* Reconcile founders' note */}
        <section className="section">
          <div className="card card-pad">
            <SectionHeader n="" label="Posición y método" />
            <p className="about-note" style={{ marginTop: 14 }}>
              Decimos de frente lo que pensamos en una sola página, firmada por el equipo, y dejamos
              que el resto sea matemática. Esa nota dice que el código es público y los supuestos
              están a la vista. Esta página es esa vista, y aquí está el código.
              <br />
              <br />
              <a className="lnk" href="/voto21junio/quienes-somos">
                Leer la nota de los fundadores <span className="arr">→</span>
              </a>
            </p>
          </div>
        </section>
      </main>
      <VotoFooter days={days} />
    </>
  );
}

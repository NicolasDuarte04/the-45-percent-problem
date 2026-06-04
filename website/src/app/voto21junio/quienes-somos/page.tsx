/**
 * Quiénes somos (Session 01) — the single canonical home of the founders'
 * note. The open-partisan declaration lives here and nowhere else.
 */

import type { Metadata } from "next";
import { TopBar } from "../_components/TopBar";
import { SectionHeader } from "../_components/SectionHeader";
import { FoundersNote } from "@/components/voto/FoundersNote";

export const metadata: Metadata = {
  title: "Quiénes somos · El Voto del 21 de Junio",
};

export default function QuienesSomosPage() {
  return (
    <>
      <TopBar variant="inner" />
      <main className="wrap">
        <section className="section" style={{ paddingTop: 18 }}>
          <SectionHeader n="" label="Posición y método" title="Quiénes somos" />
          <div className="card card-pad" style={{ marginTop: 18 }}>
            <FoundersNote />
          </div>
        </section>
      </main>
    </>
  );
}

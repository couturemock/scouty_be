import React from "react";
import { SceneKey } from "../timeline";
import { S01Versus } from "./S01Versus";
import { S02Dropshipping } from "./S02Dropshipping";
import { S03Ecommerce } from "./S03Ecommerce";
import { S04Problem } from "./S04Problem";
import { S05Brand } from "./S05Brand";
import { S06Discovery } from "./S06Discovery";
import { S07Ads } from "./S07Ads";
import { S08Suppliers } from "./S08Suppliers";
import { S09Engines } from "./S09Engines";
import { S10Sources } from "./S10Sources";
import { S11BlindVsData } from "./S11BlindVsData";
import { S12Close } from "./S12Close";

export const SCENE_COMPONENTS: Record<SceneKey, React.FC> = {
  s01: S01Versus,
  s02: S02Dropshipping,
  s03: S03Ecommerce,
  s04: S04Problem,
  s05: S05Brand,
  s06: S06Discovery,
  s07: S07Ads,
  s08: S08Suppliers,
  s09: S09Engines,
  s10: S10Sources,
  s11: S11BlindVsData,
  s12: S12Close,
};

export const SCENE_TITLES: Record<SceneKey, string> = {
  s01: "01-Versus",
  s02: "02-Dropshipping",
  s03: "03-Ecommerce",
  s04: "04-Problema",
  s05: "05-Marca",
  s06: "06-Descubrimiento",
  s07: "07-Anuncios",
  s08: "08-Proveedores-Margen",
  s09: "09-Motores",
  s10: "10-Rastreo-24-7",
  s11: "11-Ciegas-vs-Datos",
  s12: "12-Cierre",
};

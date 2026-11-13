const POWER_SOURCE_ICONS: Readonly<Record<number, string>> = {
  32873: '01_L.svg',
  32874: '02_N.svg',
  32883: '03_PE.svg',
  32872: '04_LN.svg',
  32906: '05_LNPE.svg',
  32870: '06_LLL.svg',
  32879: '07_LLLPE.svg',
  32869: '08_LLLN.svg',
  32882: '09_LLLNPE.svg',
  32876: '10_plus.svg',
  32877: '11_minus.svg',
  32875: '12_plus_minus.svg',
  33042: '13_ground.svg',
  32995: '14_transformer.svg',
  33045: '15_transformer_tap.svg',
  33043: '16_diode.svg',
  32997: '17_bridge_rectifier.svg',
  32998: '18_converter_AC_DC.svg',
  33044: '19_converter_AC_DC_3.svg',
  33046: '20_battery.svg',
  33263: '21_socket_3pin.svg',
};

const FUSE_ICONS: Readonly<Record<number, string>> = {
  32853: '01_fuse_1P.svg',
  32842: '02_fuse_1P_N.svg',
  32839: '03_fuse_2P.svg',
  32840: '04_fuse_3P.svg',
  32841: '05_fuse_3P_N.svg',
  32854: '06_fuse_switch_1P.svg',
  32843: '07_fuse_switch_1P_N.svg',
  32844: '08_fuse_switch_2P.svg',
  32845: '09_fuse_switch_3P.svg',
  32848: '10_fuse_switch_3P_N.svg',
};

const CONTACTOR_ICONS: Readonly<Record<number, string>> = {
  32899: '01_disconnector_1P.svg',
  32834: '02_disconnector_2P.svg',
  32833: '03_disconnector_3P.svg',
  32835: '04_disconnector_4P.svg',
  33219: '05_disconnector_3P_release.svg',
  32900: '06_disconnector_handle_1P.svg',
  32836: '07_disconnector_handle_2P.svg',
  32837: '08_disconnector_handle_3P.svg',
  32838: '09_disconnector_handle_4P.svg',
  33392: '10_mechanical_link_trip.svg',
};

const PROTECTION_ICONS: Readonly<Record<number, string>> = {
  32858: '01_trip_switch_1P.svg',
  32859: '02_trip_switch_1P_N.svg',
  32860: '03_trip_switch_2P.svg',
  32861: '04_trip_switch_3P.svg',
  32862: '05_trip_switch_3P_N.svg',
  32863: '06_contactor_2P.svg',
  32864: '07_contactor_4P.svg',
  32865: '08_thermal_3P.svg',
  32898: '09_thermal_block_1P.svg',
  33050: '10_thermal_block_1P_N.svg',
  32866: '11_thermal_block_2P.svg',
  32867: '12_thermal_block_3P.svg',
  33052: '13_thermal_block_3P_N.svg',
  33054: '14_diode_array_2.svg',
  33055: '15_diode_array_4.svg',
};

const MOTOR_ICONS: Readonly<Record<number, string>> = {
  32828: '01_motor_top3.svg',
  32829: '02_motor_top3_bottom3.svg',
  32830: '03_motor_top2.svg',
  33103: '04_motor_PE.svg',
  33237: '05_motor_split_terminal.svg',
  32831: '06_motor_D.svg',
  32994: '07_motor_II.svg',
  32832: '08_motor_double_ring.svg',
  32999: '09_motor_small_bracket.svg',
  33000: '10_motor_small_bar.svg',
  33295: '11_motor_3ph_round.svg',
  33296: '12_motor_3ph_pointed.svg',
  33104: '13_hood_dashed.svg',
  33257: '14_device_box.svg',
};

const AUX_CONTACT_ICONS: Readonly<Record<number, string>> = {
  32937: '01_contact_NO.svg',
  32938: '02_contact_NC.svg',
  32939: '03_contact_NO_NC.svg',
  32940: '04_contact_changeover.svg',
  32933: '05_contact_NO_arrowL.svg',
  32934: '06_contact_NC_arrowL.svg',
  32935: '07_contact_NO_NC_arrowL.svg',
  32936: '08_contact_changeover_arrowL.svg',
  32941: '09_contact_NO_arrowR.svg',
  32942: '10_contact_NC_arrowR.svg',
  32943: '11_contact_NO_NC_arrowR.svg',
  32944: '12_contact_changeover_arrowR.svg',
  32945: '13_contact_NO_circle.svg',
  32946: '14_contact_NC_circle.svg',
  32947: '15_contact_NO_NC_circle.svg',
  32948: '16_contact_changeover_circle.svg',
};

const MANUAL_CONTROL_ICONS: Readonly<Record<number, string>> = {
  33278: '00_dot.svg',
  32909: '01_E_no.svg',
  32910: '02_E_nc.svg',
  32912: '03_E_nc_no.svg',
  32913: '04_E_changeover.svg',
  32914: '05_ring_no.svg',
  32915: '06_ring_nc.svg',
  32917: '07_ring_nc_no.svg',
  32918: '08_ring_changeover.svg',
  32919: '09_F_no.svg',
  32920: '10_F_nc.svg',
  32921: '11_F_nc_no.svg',
  32922: '12_F_changeover.svg',
  33047: '13_F_neutral.svg',
  33048: '14_F_double.svg',
  33049: '15_F_cross.svg',
  32923: '16_dot_no.svg',
  32924: '17_dot_nc.svg',
  32925: '18_dot_nc_no.svg',
  32926: '19_dot_changeover.svg',
  32927: '20_pi_no.svg',
  32928: '21_pi_nc.svg',
  32929: '22_pi_nc_no.svg',
  32930: '23_pi_changeover.svg',
};

const COIL_SIGNAL_ICONS: Readonly<Record<number, string>> = {
  32949: '01_coil.svg',
  32956: '02_coil_two_windings.svg',
  32964: '03_coil_delay_on_release.svg',
  32951: '04_coil_with_linkage.svg',
  32952: '05_coil_indicator_cell.svg',
  32953: '06_coil_half_filled.svg',
  32954: '07_coil_half_filled_zigzag.svg',
  32955: '08_coil_pulse_up.svg',
  33223: '09_coil_pulse_peaks.svg',
  33098: '10_coil_bidirectional.svg',
  33236: '11_coil_slot.svg',
  32957: '12_lamp.svg',
  32958: '13_lamp_flashing.svg',
  32961: '14_horn_d.svg',
  32962: '15_buzzer.svg',
  32960: '16_triangle.svg',
  32959: '17_element_with_link.svg',
};

const POWER_ELECTRONICS_ICONS: Readonly<Record<number, string>> = {
  33002: '01_resistor_element.svg',
  33003: '02_three_elements.svg',
  33004: '03_three_bars.svg',
  33005: '04_rectifier_module.svg',
  33089: '05_cont_diode_arrow.svg',
  33262: '06_cont_diode_arrow_both.svg',
  33006: '07_transistor_module_2_3.svg',
  33007: '08_transistor_module_2_3b.svg',
  33011: '09_cont_sine.svg',
  33015: '10_diode_module_2_2.svg',
  33016: '11_diode_module_2_4.svg',
  33018: '12_diode_module_3_2.svg',
  33017: '13_diode_module_3_4.svg',
  33012: '14_cont_dc.svg',
  33297: '15_cont_pulse_1.svg',
  33298: '16_cont_pulse_2.svg',
  33299: '17_cont_pulse_3.svg',
};

export function createPowerSourceIcon(commandId: number): HTMLElement | undefined {
  return createPaletteIcon('power-sources', POWER_SOURCE_ICONS[commandId]);
}

export function createFuseIcon(commandId: number): HTMLElement | undefined {
  return createPaletteIcon('fuses', FUSE_ICONS[commandId]);
}

export function createContactorIcon(commandId: number): HTMLElement | undefined {
  return createPaletteIcon('contactors', CONTACTOR_ICONS[commandId]);
}

export function createProtectionIcon(commandId: number): HTMLElement | undefined {
  return createPaletteIcon('protection', PROTECTION_ICONS[commandId]);
}

export function createMotorIcon(commandId: number): HTMLElement | undefined {
  return createPaletteIcon('motors', MOTOR_ICONS[commandId]);
}

export function createAuxContactIcon(commandId: number): HTMLElement | undefined {
  return createPaletteIcon('aux-contacts', AUX_CONTACT_ICONS[commandId]);
}

export function createManualControlIcon(commandId: number): HTMLElement | undefined {
  return createPaletteIcon('manual-controls', MANUAL_CONTROL_ICONS[commandId]);
}

export function createCoilSignalIcon(commandId: number): HTMLElement | undefined {
  return createPaletteIcon('coils-signaling', COIL_SIGNAL_ICONS[commandId]);
}

export function createPowerElectronicsIcon(commandId: number): HTMLElement | undefined {
  return createPaletteIcon('power-electronics', POWER_ELECTRONICS_ICONS[commandId]);
}

function createPaletteIcon(category: string, file: string | undefined): HTMLElement | undefined {
  if (!file) return undefined;
  const wrapper = document.createElement('span');
  wrapper.className = 'palette-symbol palette-themed-asset';
  wrapper.setAttribute('aria-hidden', 'true');
  for (const theme of ['light', 'dark'] as const) {
    const image = document.createElement('img');
    image.className = `palette-theme-image palette-theme-${theme}`;
    image.alt = '';
    image.src = `${import.meta.env.BASE_URL}icons/${category}/${theme}/${file}`;
    wrapper.append(image);
  }
  return wrapper;
}

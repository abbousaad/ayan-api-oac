const { config } = require('../config/env');
const { runQuery } = require('../db/pool');
const { getUIThemeConfigStore } = require('../data/ui-theme-config');

const mapThemeRow = (row) => ({
  primaryColor: row.primary_color,
  textColor: row.text_color,
  secondaryColor: row.secondary_color,
  subtitle1Color: row.subtitle_1_color,
  subtitle2Color: row.subtitle_2_color,
  logoTitleColor: row.logo_title_color,
  logoSubtitleColor: row.logo_subtitle_color,
  mainButtonBgColor: row.main_button_bg_color,
  secButtonBgColor: row.sec_button_bg_color,
  homeSubtitleTextColor: row.home_subtitle_text_color,
  homeTitleColor: row.home_title_color,
  accentColor: row.accent_color,
  cardBgColor: row.card_bg_color,
  checkoutButtonBgColor: row.checkout_button_bg_color,
  cartTitleColor: row.cart_title_color,
  sectionTitleColor: row.section_title_color,
  bodyTextColor: row.body_text_color,
  priceColor: row.price_color,
  pageBgColor: row.page_bg_color,
  navBgColor: row.nav_bg_color
});

const getThemeConfig = async () => {
  if (config.useInMemoryPersistence) {
    return { ...getUIThemeConfigStore() };
  }

  const result = await runQuery(
    `SELECT primary_color, text_color, secondary_color, subtitle_1_color, subtitle_2_color,
            logo_title_color, logo_subtitle_color, main_button_bg_color, sec_button_bg_color,
            home_subtitle_text_color, home_title_color, accent_color, card_bg_color,
            checkout_button_bg_color, cart_title_color, section_title_color, body_text_color,
            price_color, page_bg_color, nav_bg_color
     FROM ui_theme_config WHERE id = $1 LIMIT 1`,
    ['default']
  );

  if (!result.rows[0]) {
    return { ...getUIThemeConfigStore() };
  }

  return mapThemeRow(result.rows[0]);
};

const updateThemeConfig = async (changes) => {
  if (config.useInMemoryPersistence) {
    const state = getUIThemeConfigStore();
    Object.assign(state, changes);
    return { ...state };
  }

  const current = await getThemeConfig();
  const next = { ...current, ...changes };

  const result = await runQuery(
    `UPDATE ui_theme_config
     SET primary_color = $2,
         text_color = $3,
         secondary_color = $4,
         subtitle_1_color = $5,
         subtitle_2_color = $6,
         logo_title_color = $7,
         logo_subtitle_color = $8,
         main_button_bg_color = $9,
         sec_button_bg_color = $10,
         home_subtitle_text_color = $11,
         home_title_color = $12,
         accent_color = $13,
         card_bg_color = $14,
         checkout_button_bg_color = $15,
         cart_title_color = $16,
         section_title_color = $17,
         body_text_color = $18,
         price_color = $19,
         page_bg_color = $20,
         nav_bg_color = $21,
         updated_at = NOW()
     WHERE id = $1
     RETURNING primary_color, text_color, secondary_color, subtitle_1_color, subtitle_2_color,
               logo_title_color, logo_subtitle_color, main_button_bg_color, sec_button_bg_color,
               home_subtitle_text_color, home_title_color, accent_color, card_bg_color,
               checkout_button_bg_color, cart_title_color, section_title_color, body_text_color,
               price_color, page_bg_color, nav_bg_color`,
    [
      'default',
      next.primaryColor,
      next.textColor,
      next.secondaryColor,
      next.subtitle1Color,
      next.subtitle2Color,
      next.logoTitleColor,
      next.logoSubtitleColor,
      next.mainButtonBgColor,
      next.secButtonBgColor,
      next.homeSubtitleTextColor,
      next.homeTitleColor,
      next.accentColor,
      next.cardBgColor,
      next.checkoutButtonBgColor,
      next.cartTitleColor,
      next.sectionTitleColor,
      next.bodyTextColor,
      next.priceColor,
      next.pageBgColor,
      next.navBgColor
    ]
  );

  return result.rows[0] ? mapThemeRow(result.rows[0]) : null;
};

module.exports = { getThemeConfig, updateThemeConfig };

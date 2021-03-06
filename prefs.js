//  GNOME Shell Extension TaskBar
//  Copyright (C) 2013 zpydr
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with this program.  If not, see <https://www.gnu.org/licenses/>.
//
//  zpydr@linuxwaves.com

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Lib = Extension.imports.lib;

const Gettext = imports.gettext.domain('TaskBar');
const _ = Gettext.gettext;

const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;

const schema = "org.gnome.shell.extensions.TaskBar";

const DESKTOPICONPATH = Extension.path + '/images/desktop-default.png';
const APPVIEWICONPATH = Extension.path + '/images/view-grid-symbolic.svg';

function init()
{
    initTranslations("TaskBar");
}

/**
 * initTranslations:
 * @domain: (optional): the gettext domain to use
 *
 * Initialize Gettext to load translations from extensionsdir/locale.
 * If @domain is not provided, it will be taken from metadata['gettext-domain']
 */
function initTranslations(domain) {
    let extension = ExtensionUtils.getCurrentExtension();

    domain = domain || extension.metadata['gettext-domain'];

    // check if this extension was built with "make zip-file", and thus
    // has the locale files in a subfolder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell
    let localeDir = extension.dir.get_child('locale');
    if (localeDir.query_exists(null))
        imports.gettext.bindtextdomain(domain, localeDir.get_path());
    else
        imports.gettext.bindtextdomain(domain, Config.LOCALEDIR);
}

function buildPrefsWidget()
{
    let prefs = new Prefs(schema);
    return prefs.scrollWindowPrefs();
}

function Prefs(schema)
{
    this.init(schema);
}

Prefs.prototype =
{
    settings: null,

    init: function(schema)
    {
        let settings = new Lib.Settings(schema);
        this.settings = settings.getSettings();
        this.buildPrefsWidget();
    },

    buildPrefsWidget: function()
    {
        this.grid = new Gtk.Grid();
        this.grid.margin = this.grid.row_spacing = 10;
        this.grid.column_spacing = 2;

        this.newValueAppearance = null;
        this.oldValueAppearance = null;

        let labelComponents = new Gtk.Label({ label: "\n<b>"+_("Components")+"</b>", use_markup: true, xalign: 0});
        this.grid.attach(labelComponents, 1, 0, 1, 1);

        let labelDisplayTasks = new Gtk.Label({label: _("Tasks"), xalign: 0});
        this.grid.attach(labelDisplayTasks, 1, 1, 1, 1);
        this.valueDisplayTasks = new Gtk.Switch({active: this.settings.get_boolean("display-tasks")});
        this.valueDisplayTasks.connect('notify::active', Lang.bind(this, this.changeDisplayTasks));
        this.grid.attach(this.valueDisplayTasks, 4, 1, 2, 1);

        let labelDisplayDesktopButton = new Gtk.Label({label: _("Desktop Button"), xalign: 0});
        this.grid.attach(labelDisplayDesktopButton, 1, 2, 1, 1);
        this.valueDisplayDesktopButton = new Gtk.Switch({active: this.settings.get_boolean("display-desktop-button")});
        this.valueDisplayDesktopButton.connect('notify::active', Lang.bind(this, this.changeDisplayDesktopButton));
        this.grid.attach(this.valueDisplayDesktopButton, 4, 2, 2, 1);

        let labelDisplayWorkspaceButton = new Gtk.Label({label: _("Workspace Button"), xalign: 0});
        this.grid.attach(labelDisplayWorkspaceButton, 1, 3, 1, 1);
        this.valueDisplayWorkspaceButton = new Gtk.Switch({active: this.settings.get_boolean("display-workspace-button")});
        this.valueDisplayWorkspaceButton.connect('notify::active', Lang.bind(this, this.changeDisplayWorkspaceButton));
        this.grid.attach(this.valueDisplayWorkspaceButton, 4, 3, 2, 1);

        let labelDisplayShowAppsButton = new Gtk.Label({label: _("Appview Button"), xalign: 0});
        this.grid.attach(labelDisplayShowAppsButton, 1, 4, 1, 1);
        this.valueDisplayShowAppsButton = new Gtk.Switch({active: this.settings.get_boolean("display-showapps-button")});
        this.valueDisplayShowAppsButton.connect('notify::active', Lang.bind(this, this.changeDisplayShowAppsButton));
        this.grid.attach(this.valueDisplayShowAppsButton, 4, 4, 2, 1);

        let labelDisplayFavorites = new Gtk.Label({label: _("Favorites"), xalign: 0});
        this.grid.attach(labelDisplayFavorites, 1, 5, 1, 1);
        this.valueDisplayFavorites = new Gtk.Switch({active: this.settings.get_boolean("display-favorites")});
        this.valueDisplayFavorites.connect('notify::active', Lang.bind(this, this.changeDisplayFavorites));
        this.grid.attach(this.valueDisplayFavorites, 4, 5, 2, 1);

        let labelAdjustments = new Gtk.Label({ label: "\n<b>"+_("Settings")+"</b>", use_markup: true, xalign: 0});
        this.grid.attach(labelAdjustments, 1, 6, 1, 1);

        let labelPanelPosition = new Gtk.Label({label: _("Align Position\non Top Panel"), xalign: 0});
        this.grid.attach(labelPanelPosition, 1, 7, 1, 1);
        let valuePanelPosition = new Gtk.Button({image: new Gtk.Image({icon_name: 'back'})});
        let value2PanelPosition = new Gtk.Button({image: new Gtk.Image({icon_name: 'forward'})});
        valuePanelPosition.connect('clicked', Lang.bind(this, this.changePanelPositionLeft));
        value2PanelPosition.connect('clicked', Lang.bind(this, this.changePanelPositionRight));
        this.grid.attach(valuePanelPosition, 4, 7, 1, 1);
        this.grid.attach(value2PanelPosition, 5, 7, 1, 1);

        let labelBottomPanel = new Gtk.Label({label: _("Bottom Panel"), xalign: 0});
        this.grid.attach(labelBottomPanel, 1, 8, 1, 1);
        this.valueBottomPanel = new Gtk.Switch({active: this.settings.get_boolean("bottom-panel")});
        this.valueBottomPanel.connect('notify::active', Lang.bind(this, this.changeBottomPanel));
        this.grid.attach(this.valueBottomPanel, 4, 8, 2, 1);

        let labelBottomPanelVertical = new Gtk.Label({label: _("Vertical Adjustment\nBottom Panel")+" [0]", xalign: 0});
        this.grid.attach(labelBottomPanelVertical, 1, 9, 1, 1);
        this.valueBottomPanelVertical = new Gtk.Adjustment({lower: -20, upper: 20, step_increment: 1});
        this.value2BottomPanelVertical = new Gtk.SpinButton({adjustment: this.valueBottomPanelVertical, snap_to_ticks: true});
        this.value2BottomPanelVertical.set_value(this.settings.get_int("bottom-panel-vertical"));
        this.value2BottomPanelVertical.connect("value-changed", Lang.bind(this, this.changeBottomPanelVertical));
        this.grid.attach(this.value2BottomPanelVertical, 3, 9, 3, 1);

        let labelIconSize = new Gtk.Label({label: _("Icon Size")+" [22]", xalign: 0});
        this.grid.attach(labelIconSize, 1, 10, 1, 1);
        this.valueIconSize = new Gtk.Adjustment({lower: 1, upper: 96, step_increment: 1});
        let value2IconSize = new Gtk.SpinButton({adjustment: this.valueIconSize, snap_to_ticks: true});
        value2IconSize.set_value(this.settings.get_int("icon-size"));
        value2IconSize.connect("value-changed", Lang.bind(this, this.changeIconSize));
        this.grid.attach(value2IconSize, 3, 10, 3, 1);

        let labelCloseButton = new Gtk.Label({label: _("Close Tasks"), xalign: 0});
        this.grid.attach(labelCloseButton, 1, 11, 1, 1);
        this.valueCloseButton = new Gtk.ComboBoxText();
        this.valueCloseButton.append_text(_("OFF"));
        this.valueCloseButton.append_text(_("Middle Click"));
        this.valueCloseButton.append_text(_("Right Click"));
        this.valueCloseButton.set_active(this.settings.get_enum("close-button"));
        this.valueCloseButton.connect('changed', Lang.bind(this, this.changeCloseButton));
        this.grid.attach(this.valueCloseButton, 3, 11, 3, 1);

        let labelActiveTaskFrame = new Gtk.Label({label: _("Active Task Frame"), xalign: 0});
        this.grid.attach(labelActiveTaskFrame, 1, 12, 1, 1);
        this.valueActiveTaskFrame = new Gtk.Switch({active: this.settings.get_boolean("active-task-frame")});
        this.valueActiveTaskFrame.connect('notify::active', Lang.bind(this, this.changeActiveTaskFrame));
        this.grid.attach(this.valueActiveTaskFrame, 4, 12, 2, 1);

        let labelActiveTaskBackgroundColor = new Gtk.Label({label: _("Active Task\nBackground Color"), xalign: 0});
        this.grid.attach(labelActiveTaskBackgroundColor, 1, 13, 1, 1);
        let valueActiveTaskBackgroundColor2 = this.settings.get_string("active-task-background-color");
        this.valueActiveTaskBackgroundColor = new Gtk.ColorButton();
        this.valueActiveTaskBackgroundColor.set_title("TaskBar Preferences - Active Task Background Color");
        this.color = new Gdk.RGBA();
        this.color.parse(valueActiveTaskBackgroundColor2);
        this.valueActiveTaskBackgroundColor.set_rgba(this.color);
        this.valueActiveTaskBackgroundColor.connect('clicked', Lang.bind(this, this.changeActiveTaskBackgroundColor));
        this.grid.attach(this.valueActiveTaskBackgroundColor, 4, 13, 2, 1);

        let labelHoverSwitchTask = new Gtk.Label({label: _("Activate Tasks on Hover"), xalign: 0});
        this.grid.attach(labelHoverSwitchTask, 1, 14, 1, 1);
        this.valueHoverSwitchTask = new Gtk.Switch({active: this.settings.get_boolean("hover-switch-task")});
        this.valueHoverSwitchTask.connect('notify::active', Lang.bind(this, this.changeHoverSwitchTask));
        this.grid.attach(this.valueHoverSwitchTask, 4, 14, 2, 1);

        let labelButtons = new Gtk.Label({ label: "\n<b>"+_("Buttons")+"</b>", use_markup: true, xalign: 0});
        this.grid.attach(labelButtons, 1, 15, 1, 1);

        let labelDesktopButtonIcon = new Gtk.Label({label: _("Desktop Button Icon"), xalign: 0});
        this.grid.attach(labelDesktopButtonIcon, 1, 16, 1, 1);
        this.valueDesktopButtonIcon = new Gtk.Image();
        this.desktopIconFilename = this.settings.get_string("desktop-button-icon");
        this.loadDesktopIcon();
        this.valueDesktopButtonIcon2 = new Gtk.Button({image: this.valueDesktopButtonIcon});
        this.valueDesktopButtonIcon2.connect('clicked', Lang.bind(this, this.changeDesktopButtonIcon));
        this.grid.attach(this.valueDesktopButtonIcon2, 4, 16, 2, 1);

        let labelDesktopButtonRightClick = new Gtk.Label({label: _("Desktop Button Right Click\nopens Preferences (this)"), xalign: 0});
        this.grid.attach(labelDesktopButtonRightClick, 1, 17, 1, 1);
        this.valueDesktopButtonRightClick = new Gtk.Switch({active: this.settings.get_boolean("desktop-button-right-click")});
        this.valueDesktopButtonRightClick.connect('notify::active', Lang.bind(this, this.changeDesktopButtonRightClick));
        this.grid.attach(this.valueDesktopButtonRightClick, 4, 17, 2, 1);

        let labelWorkspaceButtonIndex = new Gtk.Label({label: _("Workspace Button Index"), xalign: 0});
        this.grid.attach(labelWorkspaceButtonIndex, 1, 18, 1, 1);
        this.valueWorkspaceButtonIndex = new Gtk.ComboBoxText();
        this.valueWorkspaceButtonIndex.append_text(_("Index"));
        this.valueWorkspaceButtonIndex.append_text(_("Index/Total"));
        this.valueWorkspaceButtonIndex.set_active(this.settings.get_enum("workspace-button-index"));
        this.valueWorkspaceButtonIndex.connect('changed', Lang.bind(this, this.changeWorkspaceButtonIndex));
        this.grid.attach(this.valueWorkspaceButtonIndex, 3, 18, 3, 1);

        let labelFontSize = new Gtk.Label({label: _("Workspace Button\nFont Size")+" [16]", xalign: 0});
        this.grid.attach(labelFontSize, 1, 19, 1, 1);
        this.valueFontSize = new Gtk.Adjustment({lower: 1, upper: 96, step_increment: 1});
        let value2FontSize = new Gtk.SpinButton({adjustment: this.valueFontSize, snap_to_ticks: true});
        value2FontSize.set_value(this.settings.get_int("font-size"));
        value2FontSize.connect("value-changed", Lang.bind(this, this.changeFontSize));
        this.grid.attach(value2FontSize, 3, 19, 3, 1);

        let labelShowAppsButtonToggle = new Gtk.Label({label: _("Appview Button\nL/R Click Toggle"), xalign: 0});
        this.grid.attach(labelShowAppsButtonToggle, 1, 20, 1, 1);
        this.valueShowAppsButtonToggle = new Gtk.ComboBoxText();
        this.valueShowAppsButtonToggle.append_text(_("L Appview\nR Overview"));
        this.valueShowAppsButtonToggle.append_text(_("L Overview\nR Appview"));
        this.valueShowAppsButtonToggle.set_active(this.settings.get_enum("showapps-button-toggle"));
        this.valueShowAppsButtonToggle.connect('changed', Lang.bind(this, this.changeShowAppsButtonToggle));
        this.grid.attach(this.valueShowAppsButtonToggle, 3, 20, 3, 1);

        let labelAppviewButtonIcon = new Gtk.Label({label: _("Appview Button Icon"), xalign: 0});
        this.grid.attach(labelAppviewButtonIcon, 1, 21, 1, 1);
        this.valueAppviewButtonIcon = new Gtk.Image();
        this.appviewIconFilename = this.settings.get_string("appview-button-icon");
        this.loadAppviewIcon();
        this.valueAppviewButtonIcon2 = new Gtk.Button({image: this.valueAppviewButtonIcon});
        this.valueAppviewButtonIcon2.connect('clicked', Lang.bind(this, this.changeAppviewButtonIcon));
        this.grid.attach(this.valueAppviewButtonIcon2, 4, 21, 2, 1);

        let labelMisc = new Gtk.Label({ label: "\n<b>"+_("Misc *")+"</b>", use_markup: true, xalign: 0});
        this.grid.attach(labelMisc, 1, 22, 1, 1);

        let labelHideActivities = new Gtk.Label({label: _("Hide Activities"), xalign: 0});
        this.grid.attach(labelHideActivities, 1, 23, 1, 1);
        this.valueHideActivities = new Gtk.Switch({active: this.settings.get_boolean("hide-activities")});
        this.valueHideActivities.connect('notify::active', Lang.bind(this, this.changeHideActivities));
        this.grid.attach(this.valueHideActivities, 4, 23, 2, 1);

        let labelDisableHotCorner = new Gtk.Label({label: _("Disable Hot Corner"), xalign: 0});
        this.grid.attach(labelDisableHotCorner, 1, 24, 1, 1);
        this.valueDisableHotCorner = new Gtk.Switch({active: this.settings.get_boolean("disable-hotcorner")});
        this.valueDisableHotCorner.connect('notify::active', Lang.bind(this, this.changeDisableHotCorner));
        this.grid.attach(this.valueDisableHotCorner, 4, 24, 2, 1);

        let labelHideDefaultApplicationMenu = new Gtk.Label({label: _("Hide Default App Menu"), xalign: 0});
        this.grid.attach(labelHideDefaultApplicationMenu, 1, 25, 1, 1);
        this.valueHideDefaultApplicationMenu = new Gtk.Switch({active: this.settings.get_boolean("hide-default-application-menu")});
        this.valueHideDefaultApplicationMenu.connect('notify::active', Lang.bind(this, this.changeHideDefaultApplicationMenu));
        this.grid.attach(this.valueHideDefaultApplicationMenu, 4, 25, 2, 1);

        let labelWarning = new Gtk.Label({ label: "<b>* </b>"+_("Possible conflict\nwith other extensions"), use_markup: true, xalign: 0 });
        this.grid.attach(labelWarning, 1, 26, 1, 1);

        let labelPreview = new Gtk.Label({ label: "\n<b>"+_("Preview")+"</b>", use_markup: true, xalign: 0 });
        this.grid.attach(labelPreview, 1, 27, 1, 1);

        let labelDisplayLabel = new Gtk.Label({label: _("Tasks Label"), xalign: 0});
        this.grid.attach(labelDisplayLabel, 1, 28, 1, 1);
        this.valueDisplayLabel = new Gtk.Switch({active: this.settings.get_boolean("display-label")});
        this.valueDisplayLabel.connect('notify::active', Lang.bind(this, this.changeDisplayLabel));
        this.grid.attach(this.valueDisplayLabel, 4, 28, 2, 1);

        let labelDisplayThumbnail = new Gtk.Label({label: _("Tasks Thumbnail"), xalign: 0});
        this.grid.attach(labelDisplayThumbnail, 1, 29, 1, 1);
        this.valueDisplayThumbnail = new Gtk.Switch({active: this.settings.get_boolean("display-thumbnail")});
        this.valueDisplayThumbnail.connect('notify::active', Lang.bind(this, this.changeDisplayThumbnail));
        this.grid.attach(this.valueDisplayThumbnail, 4, 29, 2, 1);

        let labelDisplayFavoritesLabel = new Gtk.Label({label: _("Favorites Label"), xalign: 0});
        this.grid.attach(labelDisplayFavoritesLabel, 1, 30, 1, 1);
        this.valueDisplayFavoritesLabel = new Gtk.Switch({active: this.settings.get_boolean("display-favorites-label")});
        this.valueDisplayFavoritesLabel.connect('notify::active', Lang.bind(this, this.changeDisplayFavoritesLabel));
        this.grid.attach(this.valueDisplayFavoritesLabel, 4, 30, 2, 1);

        let labelPreviewSize = new Gtk.Label({label: _("Thumbnail Size")+" [350]", xalign: 0});
        this.grid.attach(labelPreviewSize, 1, 31, 1, 1);
        this.valuePreviewSize = new Gtk.Adjustment({lower: 100, upper: 1000, step_increment: 50});
        let value2PreviewSize = new Gtk.SpinButton({adjustment: this.valuePreviewSize, snap_to_ticks: true});
        value2PreviewSize.set_value(this.settings.get_int("preview-size"));
        value2PreviewSize.connect("value-changed", Lang.bind(this, this.changePreviewSize));
        this.grid.attach(value2PreviewSize, 3, 31, 3, 1);

        let labelPreviewDelay = new Gtk.Label({label: _("Preview Delay")+" [500] "+_("(ms)"), xalign: 0});
        this.grid.attach(labelPreviewDelay, 1, 32, 2, 1);
        this.valuePreviewDelay = new Gtk.Adjustment({lower: 0, upper: 3000, step_increment: 250});
        let value2PreviewDelay = new Gtk.SpinButton({adjustment: this.valuePreviewDelay, snap_to_ticks: true});
        value2PreviewDelay.set_value(this.settings.get_int("preview-delay"));
        value2PreviewDelay.connect("value-changed", Lang.bind(this, this.changePreviewDelay));
        this.grid.attach(value2PreviewDelay, 3, 32, 3, 1);

        let labelAppearance = new Gtk.Label({ label: "\n<b>"+_("Appearance")+"</b>", use_markup: true, xalign: 0 });
        this.grid.attach(labelAppearance, 1, 33, 1, 1);

        let labelLeftToRight = new Gtk.Label({ label: _("From Left to Right"), use_markup: true, xalign: 0 });
        this.grid.attach(labelLeftToRight, 1, 34, 1, 1);

        this.valueAppearanceOne = new Gtk.ComboBoxText();
        this.valueAppearanceOne.append_text(_("Tasks"));
        this.valueAppearanceOne.append_text(_("Desktop Button"));
        this.valueAppearanceOne.append_text(_("Workspace Button"));
        this.valueAppearanceOne.append_text(_("Appview Button"));
        this.valueAppearanceOne.append_text(_("Favorites"));
        this.valueAppearanceOne.set_active(this.settings.get_enum("appearance-one"));
        this.valueAppearanceOne.connect('changed', Lang.bind(this, this.changeAppearanceOne));
        this.grid.attach(this.valueAppearanceOne, 1, 35, 1, 1);

        this.valueAppearanceTwo = new Gtk.ComboBoxText();
        this.valueAppearanceTwo.append_text(_("Tasks"));
        this.valueAppearanceTwo.append_text(_("Desktop Button"));
        this.valueAppearanceTwo.append_text(_("Workspace Button"));
        this.valueAppearanceTwo.append_text(_("Appview Button"));
        this.valueAppearanceTwo.append_text(_("Favorites"));
        this.valueAppearanceTwo.set_active(this.settings.get_enum("appearance-two"));
        this.valueAppearanceTwo.connect('changed', Lang.bind(this, this.changeAppearanceTwo));
        this.grid.attach(this.valueAppearanceTwo, 1, 36, 1, 1);

        this.valueAppearanceThree = new Gtk.ComboBoxText();
        this.valueAppearanceThree.append_text(_("Tasks"));
        this.valueAppearanceThree.append_text(_("Desktop Button"));
        this.valueAppearanceThree.append_text(_("Workspace Button"));
        this.valueAppearanceThree.append_text(_("Appview Button"));
        this.valueAppearanceThree.append_text(_("Favorites"));
        this.valueAppearanceThree.set_active(this.settings.get_enum("appearance-three"));
        this.valueAppearanceThree.connect('changed', Lang.bind(this, this.changeAppearanceThree));
        this.grid.attach(this.valueAppearanceThree, 1, 37, 1, 1);

        this.valueAppearanceFour = new Gtk.ComboBoxText();
        this.valueAppearanceFour.append_text(_("Tasks"));
        this.valueAppearanceFour.append_text(_("Desktop Button"));
        this.valueAppearanceFour.append_text(_("Workspace Button"));
        this.valueAppearanceFour.append_text(_("Appview Button"));
        this.valueAppearanceFour.append_text(_("Favorites"));
        this.valueAppearanceFour.set_active(this.settings.get_enum("appearance-four"));
        this.valueAppearanceFour.connect('changed', Lang.bind(this, this.changeAppearanceFour));
        this.grid.attach(this.valueAppearanceFour, 1, 38, 1, 1);

        this.valueAppearanceFive = new Gtk.ComboBoxText();
        this.valueAppearanceFive.append_text(_("Tasks"));
        this.valueAppearanceFive.append_text(_("Desktop Button"));
        this.valueAppearanceFive.append_text(_("Workspace Button"));
        this.valueAppearanceFive.append_text(_("Appview Button"));
        this.valueAppearanceFive.append_text(_("Favorites"));
        this.valueAppearanceFive.set_active(this.settings.get_enum("appearance-five"));
        this.valueAppearanceFive.connect('changed', Lang.bind(this, this.changeAppearanceFive));
        this.grid.attach(this.valueAppearanceFive, 1, 39, 1, 1);

        let labelLink1 = new Gtk.LinkButton ({image: new Gtk.Image({icon_name: 'go-home'}), label: "extensions.gnome.org",
            uri: "https://extensions.gnome.org/extension/584/taskbar", xalign: 0 });
        let resetButton = new Gtk.Button({label: _("RESET ALL")});
        resetButton.connect('clicked', Lang.bind(this, this.reset));
        this.grid.attach(resetButton, 3, 41, 3, 1);
        this.grid.attach(labelLink1, 1, 41, 1, 1);
        let labelLink2 = new Gtk.LinkButton ({image: new Gtk.Image({icon_name: 'go-home'}), label: "github.com",
            uri: "https://github.com/zpydr/gnome-shell-extension-taskbar", xalign: 0 });
        this.grid.attach(labelLink2, 1, 42, 1, 1);
        let labelVersion = new Gtk.Label({label: _("Version")+" 29"});
        this.grid.attach(labelVersion, 3, 42, 3, 1);

        let labelSpace1 = new Gtk.Label({label: "\t", xalign: 0});
        this.grid.attach(labelSpace1, 0, 1, 1, 1);
        let labelSpace2 = new Gtk.Label({label: "\t", xalign: 0,  hexpand: true});
        this.grid.attach(labelSpace2, 2, 1, 1, 1);
        let labelSpace3 = new Gtk.Label({label: "\t", xalign: 0});
        this.grid.attach(labelSpace3, 3, 1, 1, 1);
        let labelSpace4 = new Gtk.Label({label: "\t", xalign: 0});
        this.grid.attach(labelSpace4, 6, 1, 1, 1);
        let labelSpace5 = new Gtk.Label({label: "\t", xalign: 0});
        this.grid.attach(labelSpace5, 0, 40, 1, 1);
        let labelSpace6 = new Gtk.Label({label: "\t", xalign: 0});
        this.grid.attach(labelSpace6, 0, 43, 1, 1);
    },

    changeDisplayTasks: function(object, pspec)
    {
        this.settings.set_boolean("display-tasks", object.active);
    },

    changeDisplayDesktopButton: function(object, pspec)
    {
        this.settings.set_boolean("display-desktop-button", object.active);
    },

    changeDisplayWorkspaceButton: function(object, pspec)
    {
        this.settings.set_boolean("display-workspace-button", object.active);
    },

    changeDisplayShowAppsButton: function(object, pspec)
    {
        this.settings.set_boolean("display-showapps-button", object.active);
    },

    changeDisplayFavorites: function(object, pspec)
    {
        this.settings.set_boolean("display-favorites", object.active);
    },

    changePanelPositionLeft: function()
    {
        if (! this.settings.get_boolean("bottom-panel"))
        {
            this.panelPosition = this.settings.get_int("panel-position");
            this.panelBox = this.settings.get_int("panel-box");
            this.positionMaxRight = this.settings.get_int("position-max-right");
            if (this.panelPosition == 0)
            {
                if (this.panelBox > 1)
                {
                    this.signalMax = this.settings.connect("changed::position-max-right", Lang.bind(this, function()
                    {
                        this.settings.disconnect(this.signalMax);
                        this.panelPosition = this.settings.get_int("position-max-right");
                        this.settings.set_int("panel-position", this.panelPosition);
                    })),
                    this.settings.set_int("panel-box", this.panelBox - 1);
                }
            }
            else
                this.settings.set_int("panel-position", this.panelPosition - 1);
        }
    },

    changePanelPositionRight: function()
    {
        if (! this.settings.get_boolean("bottom-panel"))
        {
            this.panelPosition = this.settings.get_int("panel-position");
            this.panelBox = this.settings.get_int("panel-box");
            this.positionMaxRight = this.settings.get_int("position-max-right");
            if (this.panelPosition >= this.positionMaxRight)
            {
                if (this.panelBox < 3)
                {
                    this.settings.set_int("panel-box", this.panelBox + 1);
                    this.settings.set_int("panel-position", 0);
                }
                else
                    this.settings.set_int("panel-position", this.positionMaxRight);
            }
            else
                this.settings.set_int("panel-position", this.panelPosition + 1);
        }
    },

    changeBottomPanel: function(object, pspec)
    {
        this.settings.set_boolean("bottom-panel", object.active);
    },

    changeBottomPanelVertical: function(object)
    {
        if (! this.settings.get_boolean("bottom-panel"))
            this.value2BottomPanelVertical.set_value(this.settings.get_int("bottom-panel-vertical"));
        else
            this.settings.set_int("bottom-panel-vertical", this.valueBottomPanelVertical.get_value());
    },

    changeIconSize: function(object)
    {
        this.settings.set_int("icon-size", this.valueIconSize.get_value());
    },

    changeCloseButton: function(object)
    {
        this.settings.set_enum("close-button", this.valueCloseButton.get_active());
    },

    changeActiveTaskFrame: function(object)
    {
        this.settings.set_boolean("active-task-frame", object.active);
    },

    changeActiveTaskBackgroundColor: function()
    {
/*        let color = this.settings.get_string("active-task-background-color");
        let dialog = new Gtk.ColorChooserDialog({ title: _("TaskBar Preferences - Active Task Background Color") });
        dialog.add_button("RESET", Gtk.ResponseType.OK);
   //     dialog.set_rgba(color);
        let response = dialog.run();
        if(response == -3)
        {
        }
        if(response == -5)
        {
        }
        dialog.destroy();
*/    },

    changeHoverSwitchTask: function(object)
    {
        this.settings.set_boolean("hover-switch-task", object.active);
    },

    changeDesktopButtonIcon: function()
    {
        let iconPath = this.settings.get_string("desktop-button-icon");
        let dialog = new Gtk.FileChooserDialog({ title: _("TaskBar Preferences - Desktop Button Icon"), action: Gtk.FileChooserAction.OPEN });
        dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
        dialog.add_button(Gtk.STOCK_OPEN, Gtk.ResponseType.ACCEPT);
        dialog.add_button("RESET", Gtk.ResponseType.OK);
        dialog.set_filename(iconPath);
        let filter = new Gtk.FileFilter();
        filter.set_name(_("Images"));
        filter.add_pattern("*.png");
        filter.add_pattern("*.jpg");
        filter.add_pattern("*.gif");
        filter.add_pattern("*.svg");
        filter.add_pattern("*.ico");
        dialog.add_filter(filter);
        let response = dialog.run();
        if(response == -3)
        {
            this.desktopIconFilename = dialog.get_filename();
            if (this.desktopIconFilename != iconPath)
            {
                iconPath = this.desktopIconFilename;
                this.loadDesktopIcon();
            }
        }
        if(response == -5)
        {
            this.desktopIconFilename = DESKTOPICONPATH;
            this.loadDesktopIcon();
        }
        dialog.destroy();
    },

    loadDesktopIcon: function()
    {
        let pixbuf;
        try
        {
            pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(this.desktopIconFilename, 24, 24, null);
            this.settings.set_string("desktop-button-icon", this.desktopIconFilename);
        }
        catch (e)
        {
            pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(DESKTOPICONPATH, 24, 24, null);
            this.settings.set_string("desktop-button-icon", DESKTOPICONPATH);
        }
        this.valueDesktopButtonIcon.set_from_pixbuf(pixbuf);
    },

    changeDesktopButtonRightClick: function(object, pspec)
    {
        this.settings.set_boolean("desktop-button-right-click", object.active);
    },

    changeWorkspaceButtonIndex: function(object)
    {
        this.settings.set_enum("workspace-button-index", this.valueWorkspaceButtonIndex.get_active());
    },

    changeFontSize: function(object)
    {
        this.settings.set_int("font-size", this.valueFontSize.get_value());
    },

    changeShowAppsButtonToggle: function(object)
    {
        this.settings.set_enum("showapps-button-toggle", this.valueShowAppsButtonToggle.get_active());
    },

    changeAppviewButtonIcon: function()
    {
        let iconPath = this.settings.get_string("appview-button-icon");
        let dialog = new Gtk.FileChooserDialog({ title: _("TaskBar Preferences - Appview Button Icon"), action: Gtk.FileChooserAction.OPEN });
        dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
        dialog.add_button(Gtk.STOCK_OPEN, Gtk.ResponseType.ACCEPT);
        dialog.add_button("RESET", Gtk.ResponseType.OK);
        dialog.set_filename(iconPath);
        let filter = new Gtk.FileFilter();
        filter.set_name(_("Images"));
        filter.add_pattern("*.png");
        filter.add_pattern("*.jpg");
        filter.add_pattern("*.gif");
        filter.add_pattern("*.svg");
        filter.add_pattern("*.ico");
        dialog.add_filter(filter);
        let response = dialog.run();
        if(response == -3)
        {
            this.appviewIconFilename = dialog.get_filename();
            if (this.appviewIconFilename != iconPath)
            {
                iconPath = this.appviewIconFilename;
                this.loadAppviewIcon();
            }
        }
        if(response == -5)
        {
            this.appviewIconFilename = APPVIEWICONPATH;
            this.loadAppviewIcon();
        }
        dialog.destroy();
    },

    loadAppviewIcon: function()
    {
        let pixbuf;
        try
        {
            pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(this.appviewIconFilename, 24, 24, null);
            this.settings.set_string("appview-button-icon", this.appviewIconFilename);
        }
        catch (e)
        {
            pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(APPVIEWICONPATH, 24, 24, null);
            this.settings.set_string("appview-button-icon", APPVIEWICONPATH);
        }
        this.valueAppviewButtonIcon.set_from_pixbuf(pixbuf);
    },

    changeHideActivities: function(object, pspec)
    {
        this.settings.set_boolean("hide-activities", object.active);
    },

    changeDisableHotCorner: function(object, pspec)
    {
        this.settings.set_boolean("disable-hotcorner", object.active);
    },

    changeHideDefaultApplicationMenu: function(object, pspec)
    {
        this.settings.set_boolean("hide-default-application-menu", object.active);
    },

    changeDisplayLabel: function(object, pspec)
    {
        this.settings.set_boolean("display-label", object.active);
    },

    changeDisplayThumbnail: function(object, pspec)
    {
        this.settings.set_boolean("display-thumbnail", object.active);
    },

    changeDisplayFavoritesLabel: function(object, pspec)
    {
        this.settings.set_boolean("display-favorites-label", object.active);
    },

    changePreviewSize: function(object)
    {
        this.settings.set_int("preview-size", this.valuePreviewSize.get_value());
    },

    changePreviewDelay: function(object)
    {
        this.settings.set_int("preview-delay", this.valuePreviewDelay.get_value());
    },

    changeAppearanceOne: function(object)
    {
        this.oldValueAppearance = this.settings.get_enum("appearance-one");
        this.newValueAppearance = this.valueAppearanceOne.get_active();
        this.switchAppearance();
        this.settings.set_enum("appearance-one", this.valueAppearanceOne.get_active());
        this.setActive();
    },

    changeAppearanceTwo: function(object)
    {
        this.oldValueAppearance = this.settings.get_enum("appearance-two");
        this.newValueAppearance = this.valueAppearanceTwo.get_active();
        this.switchAppearance();
        this.settings.set_enum("appearance-two", this.valueAppearanceTwo.get_active());
        this.setActive();
    },

    changeAppearanceThree: function(object)
    {
        this.oldValueAppearance = this.settings.get_enum("appearance-three");
        this.newValueAppearance = this.valueAppearanceThree.get_active();
        this.switchAppearance();
        this.settings.set_enum("appearance-three", this.valueAppearanceThree.get_active());
        this.setActive();
    },

    changeAppearanceFour: function(object)
    {
        this.oldValueAppearance = this.settings.get_enum("appearance-four");
        this.newValueAppearance = this.valueAppearanceFour.get_active();
        this.switchAppearance();
        this.settings.set_enum("appearance-four", this.valueAppearanceFour.get_active());
        this.setActive();
    },

    changeAppearanceFive: function(object)
    {
        this.oldValueAppearance = this.settings.get_enum("appearance-five");
        this.newValueAppearance = this.valueAppearanceFive.get_active();
        this.switchAppearance();
        this.settings.set_enum("appearance-five", this.valueAppearanceFive.get_active());
        this.setActive();
    },

    switchAppearance: function()
    {
        this.appearances =
        [
            ("appearance-one"),
            ("appearance-two"),
            ("appearance-three"),
            ("appearance-four"),
            ("appearance-five")
        ];
        this.appearances.forEach(
            function(appearance)
            {
                if (this.newValueAppearance == (this.settings.get_enum(appearance)))
                    this.settings.set_enum(appearance, this.oldValueAppearance);
            },
            this
        );
    },

    setActive: function()
    {
        this.valueAppearanceOne.set_active(this.settings.get_enum("appearance-one"));
        this.valueAppearanceTwo.set_active(this.settings.get_enum("appearance-two"));
        this.valueAppearanceThree.set_active(this.settings.get_enum("appearance-three"));
        this.valueAppearanceFour.set_active(this.settings.get_enum("appearance-four"));
        this.valueAppearanceFive.set_active(this.settings.get_enum("appearance-five"));
    },

    reset: function()
    {
        this.valueDisplayTasks.set_active(true);
        this.valueDisplayDesktopButton.set_active(true);
        this.valueDisplayWorkspaceButton.set_active(true);
        this.valueDisplayShowAppsButton.set_active(true);
        this.valueDisplayFavorites.set_active(false);
        this.settings.set_int("panel-position", 1);
        this.settings.set_int("panel-box", 1);
        this.settings.set_int("position-max-right", 9);
        this.valueBottomPanel.set_active(false);
        this.valueBottomPanelVertical.set_value(0);        
        this.valueIconSize.set_value(22);
        this.valueCloseButton.set_active(0);
        this.valueActiveTaskFrame.set_active(true);
        this.valueHoverSwitchTask.set_active(false);
        this.valueDesktopButtonRightClick.set_active(true);
        this.valueWorkspaceButtonIndex.set_active(0);
        this.valueFontSize.set_value(16);
        this.valueShowAppsButtonToggle.set_active(0);
        this.valueHideActivities.set_active(false);
        this.valueDisableHotCorner.set_active(false);
        this.valueHideDefaultApplicationMenu.set_active(false);
        this.valueDisplayLabel.set_active(true);
        this.valueDisplayThumbnail.set_active(true);
        this.valueDisplayFavoritesLabel.set_active(true);
        this.valuePreviewSize.set_value(350);
        this.valuePreviewDelay.set_value(500);
        this.settings.set_enum("appearance-one", "4");
        this.settings.set_enum("appearance-two", "3");
        this.settings.set_enum("appearance-three", "2");
        this.settings.set_enum("appearance-four", "1");
        this.settings.set_enum("appearance-five", "0");
        this.setActive();
    },

    loadIcon: function(path) {
        let pixbuf;
        try {
            pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(path, 24, 24, null);
        } catch (e) {
            pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(DEFAULTDESKTOPICONPATH, 24, 24, null);
            this.settings.set_string("desktop-button-icon", DEFAULTDESKTOPICONPATH);
            this.iconPath = DEFAULTDESKTOPICONPATH;
        }
        this.valueDesktopButtonIcon.set_from_pixbuf(pixbuf);
    },

    scrollWindowPrefs: function()
    {
        let scrollWindow = new Gtk.ScrolledWindow(
        {
            'hscrollbar-policy': Gtk.PolicyType.AUTOMATIC,
            'vscrollbar-policy': Gtk.PolicyType.AUTOMATIC,
            'hexpand': true, 'vexpand': true
        });
        scrollWindow.add_with_viewport(this.grid);
        scrollWindow.show_all();
        return scrollWindow;
    }
}

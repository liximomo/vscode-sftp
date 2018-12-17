class AppState {
  private _profile: string | null = null;
  private _observer: (x: any) => void;

  get profile(): string | null {
    return this._profile;
  }

  set profile(newProfile: string | null) {
    if (this._profile === newProfile) {
      return;
    }

    this._profile = newProfile;
    this._observer(this.getStateSnapshot());
  }

  getStateSnapshot() {
    return {
      profile: this._profile,
    };
  }

  subscribe(observer) {
    this._observer = observer;
  }
}

export default AppState;

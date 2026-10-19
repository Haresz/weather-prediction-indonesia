import axios from 'axios';

export default class EndPointAccess {
  theUrl: string;

  constructor(url: string) {
    this.theUrl = url;
  }

  async getRes() {
    return axios.get(this.theUrl);
  }
}

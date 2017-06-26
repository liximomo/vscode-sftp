import { Client } from 'ssh2';
import * as fs from 'fs';
import RemoteClient, { IClientOption } from './RemoteClient';

export default class SFTPClient extends RemoteClient {
  private sftp: any;

  constructor(option?: IClientOption) {
    super(option);
  }

  initClient() {
    return new Client();
  }

  connect(readline) {
    const {
      interactiveAuth,
      password,
      privateKeyPath,
      ...option,
    } = this.getOption();
    return new Promise((resolve, reject) => {
      const connectWithCredential = (passwd?, privateKey?) => this.client
        .on('ready', () => {
          this.client.sftp((err, sftp) => {
            if (err) {
              reject(err);
            }

            this.sftp = sftp;
            resolve();
          });
        })
        .on('error', err => {
          reject(err);
        })
        .connect({
          keepaliveInterval: 1000 * 30,
          keepaliveCountMax: 2,
          readyTimeout: 99999999,
          ...option,
          privateKey,
          password: passwd,
          tryKeyboard: interactiveAuth,
        });

      if (interactiveAuth) {
        this.client.on('keyboard-interactive', function redo(
          name,
          instructions,
          instructionsLang,
          prompts,
          finish,
          stackedAnswers
        ) {
          const answers = stackedAnswers || [];
          if (answers.length < prompts.length) {
            readline(prompts[answers.length].prompt).then(answer => {
              answers.push(answer);
              redo(name, instructions, instructionsLang, prompts, finish, answers);
            });
          } else {
            finish(answers);
          }
        });
      }

      if (!privateKeyPath) {
        connectWithCredential(password);
        return;
      }

      fs.readFile(privateKeyPath, (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        connectWithCredential(password, data);
      });
    });
  }

  end() {
    return this.client.end();
  }

  getFsClient() {
    return this.sftp;
  }
}

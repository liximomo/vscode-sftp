import { Client } from 'ssh2';
import upath from '../upath';
import RemoteClient, { IClientOption } from './RemoteClient';
import SFTPFileSystem from '../Fs/SFTPFileSystem';
import localFs from '../localFs';
import FileSystem from '../Fs/FileSystem';
import RemoteFileSystem from '../Fs/RemoteFileSystem';
import logger from '../../logger';

export default class SFTPClient extends RemoteClient {
  private sftp: any;
  private hoppingClients: SFTPClient[];

  constructor(option?: IClientOption) {
    super(option);
  }

  initClient() {
    return new Client();
  }

  async connect(readline): Promise<void> {
    const { hop, ...option } = this.getOption();

    let fs: FileSystem | RemoteFileSystem = localFs;
    let sock;
    if ((Array.isArray(hop) && hop.length > 0) || (hop && Object.keys(hop).length > 0)) {
      this.hoppingClients = [];
      const connectOptions = Array.isArray(hop) ? hop.slice() : [hop];
      for (let index = 0; index < connectOptions.length; index++) {
        const connectOption = connectOptions[index];
        connectOption.port = connectOption.port || 22;
        const preClient = this.hoppingClients[index - 1];
        if (preClient) {
          sock = await this._makeHopping(preClient, connectOption.host, connectOption.port);
          fs = new SFTPFileSystem(upath, {});
          (fs as RemoteFileSystem).setClient(preClient);
        }

        const client = new SFTPClient({ ...connectOption, sock, fs });
        this.hoppingClients.push(client);
        await client.connect(readline);
      }
      sock = await this._makeHopping(
        this.hoppingClients[this.hoppingClients.length - 1],
        option.host,
        option.port
      );
    }
    await this._connectSSHClient(this.client, { ...option, sock, fs }, readline);
    this.sftp = await this._getSftp(this.client);
  }

  // connect1(readline): Promise<void> {
  //   const {
  //     interactiveAuth,
  //     password,
  //     privateKeyPath,
  //     connectTimeout,
  //     ...option // tslint:disable-line
  //   } = this.getOption();
  //   return new Promise<void>((resolve, reject) => {
  //     const connectWithCredential = (passwd?, privateKey?) =>
  //       this.client
  //         .on('ready', () => {
  //           this.client.sftp((err, sftp) => {
  //             if (err) {
  //               reject(err);
  //             }

  //             this.sftp = sftp;
  //             resolve();
  //           });
  //         })
  //         .on('error', err => {
  //           reject(err);
  //         })
  //         .connect({
  //           keepaliveInterval: 1000 * 30,
  //           keepaliveCountMax: 2,
  //           readyTimeout: interactiveAuth ? Math.max(60 * 1000, connectTimeout) : connectTimeout,
  //           ...option,
  //           privateKey,
  //           password: passwd,
  //           tryKeyboard: interactiveAuth,
  //         });

  //     if (interactiveAuth) {
  //       this.client.on('keyboard-interactive', function redo(
  //         name,
  //         instructions,
  //         instructionsLang,
  //         prompts,
  //         finish,
  //         stackedAnswers
  //       ) {
  //         const answers = stackedAnswers || [];
  //         if (answers.length < prompts.length) {
  //           readline(prompts[answers.length].prompt).then(answer => {
  //             answers.push(answer);
  //             redo(name, instructions, instructionsLang, prompts, finish, answers);
  //           });
  //         } else {
  //           finish(answers);
  //         }
  //       });
  //     }

  //     if (!privateKeyPath) {
  //       connectWithCredential(password);
  //       return;
  //     }

  //     fs.readFile(privateKeyPath, (err, data) => {
  //       if (err) {
  //         reject(err);
  //         return;
  //       }
  //       connectWithCredential(password, data);
  //     });
  //   });
  // }

  private async _connectSSHClient(
    client,
    connetOption: { fs: FileSystem; [x: string]: any },
    readline
  ): Promise<any> {
    return new Promise<void>(async (resolve, reject) => {
      const {
        fs,
        interactiveAuth,
        password,
        privateKeyPath,
        connectTimeout,
        ...option // tslint:disable-line
      } = connetOption;
      const connectWithCredential = credentiai =>
        client
          .on('ready', resolve)
          .on('error', err => {
            reject(new Error(`[${option.host}]: ${err.message}`));
          })
          .connect({
            keepaliveInterval: 1000 * 30,
            keepaliveCountMax: 2,
            readyTimeout: interactiveAuth ? Math.max(60 * 1000, connectTimeout) : connectTimeout,
            ...option,
            ...credentiai,
            tryKeyboard: interactiveAuth,
          });

      if (interactiveAuth) {
        client.on('keyboard-interactive', function redo(
          name,
          instructions,
          instructionsLang,
          prompts,
          finish,
          stackedAnswers
        ) {
          const answers = stackedAnswers || [];
          if (answers.length < prompts.length) {
            readline(`[${option.host}]: ${prompts[answers.length].prompt}`).then(answer => {
              answers.push(answer);
              redo(name, instructions, instructionsLang, prompts, finish, answers);
            });
          } else {
            finish(answers);
          }
        });
      }

      if (!privateKeyPath) {
        return connectWithCredential({ password });
      }
      try {
        const buffer = await fs.readFile(privateKeyPath);
        connectWithCredential({ privateKey: buffer.toString() });
      } catch (error) {
        reject(error);
      }
    });
  }

  private _getSftp(client): Promise<any> {
    return new Promise((resolve, reject) => {
      client.sftp((err, sftp) => {
        if (err) {
          reject(err);
        }

        resolve(sftp);
      });
    });
  }

  private _makeHopping(sftpClient: SFTPClient, dstHost, dstPort): Promise<any> {
    logger.info(`hopping from ${sftpClient.getOption().host} to ${dstHost}`);
    return new Promise((resolve, reject) => {
      // Create a connect form 127.0.0.1:port to dstHost:dstPort
      sftpClient.client.forwardOut(
        '127.0.0.1',
        sftpClient.getOption().port,
        dstHost,
        dstPort,
        (error, stream) => {
          if (error) {
            return reject(error);
          }

          resolve(stream);
        }
      );
    });
  }

  end() {
    // todo end hop clients
    this.client.end();

    if (this.hoppingClients) {
      // last connect first end
      this.hoppingClients.reverse().forEach(client => client.end());
    }
  }

  getFsClient() {
    return this.sftp;
  }
}
